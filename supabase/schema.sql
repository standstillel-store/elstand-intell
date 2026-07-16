-- ============================================================================
-- ElVoid AI Paper Trader — Supabase schema
-- ============================================================================
-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New
-- query -> paste -> Run), or via `supabase db push` if you use the CLI.
-- Every statement is idempotent, so it's safe to re-run.
--
-- Design note: ai_signals doubles as the "open position" record once a
-- signal is executed as a paper trade. There is no separate "trades" table
-- — status moves new -> open -> tp1_hit -> closed (or invalidated/expired
-- if never executed), so the signal IS the trade. This keeps the schema
-- exactly what was asked for (ai_signals / ai_journal / ai_statistics /
-- paper_wallet) without inventing extra tables.
-- ============================================================================

create extension if not exists pgcrypto; -- for gen_random_uuid()

-- ----------------------------------------------------------------------------
-- ai_signals — every signal ElVoid AI generates (scan or on-demand analysis)
-- ----------------------------------------------------------------------------
create table if not exists ai_signals (
  id uuid primary key default gen_random_uuid(),
  coin text not null,                          -- e.g. "BTC"
  side text not null check (side in ('LONG','SHORT')),
  entry numeric not null,
  sl numeric not null,
  tp1 numeric not null,
  tp2 numeric not null,
  tp3 numeric,                                 -- optional 3rd target, ElVoid AI UI redesign (2026-07)
  timeframe text not null default '4h',        -- candle interval the signal was generated on
  scans jsonb,                                 -- structured ScanResult[] snapshot, powers the AI Reasoning checklist UI
  extra_reasoning jsonb,                       -- structured extended ScanResult[] (FVG/OB/Funding/OI/SMT/MACD/Stablecoin), same purpose
  order_type text not null default 'market' check (order_type in ('market', 'limit', 'stop')),
  trade_grade text check (trade_grade in ('A+', 'A', 'B', 'C')),
  probability_tp numeric,                      -- estimated probability (%) of hitting a TP before SL — see lib/elvoid/engine.ts
  probability_sl numeric,
  confidence numeric not null check (confidence >= 0 and confidence <= 100),
  risk_percent numeric not null default 1,
  reason text not null,                        -- human-readable narrative (Bahasa Indonesia)
  strategy text not null,                      -- e.g. "Liquidity Sweep Reversal"
  status text not null default 'new' check (
    status in ('new', 'pending', 'open', 'tp1_hit', 'closed', 'invalidated', 'expired')
  ),
  created_at timestamptz not null default now()
);

-- Safe to re-run against a database created before the 2026-07 UI redesign.
alter table ai_signals add column if not exists tp3 numeric;
alter table ai_signals add column if not exists timeframe text not null default '4h';
alter table ai_signals add column if not exists scans jsonb;
alter table ai_signals add column if not exists extra_reasoning jsonb;

-- Safe to re-run against a database created before the AI Trading Terminal
-- upgrade (2026-07, part 2): Market/Limit/Stop orders, Trade Grade, and
-- Probability TP/SL.
alter table ai_signals add column if not exists order_type text not null default 'market';
alter table ai_signals add column if not exists trade_grade text;
alter table ai_signals add column if not exists probability_tp numeric;
alter table ai_signals add column if not exists probability_sl numeric;
alter table ai_signals drop constraint if exists ai_signals_order_type_check;
alter table ai_signals add constraint ai_signals_order_type_check check (order_type in ('market', 'limit', 'stop'));
alter table ai_signals drop constraint if exists ai_signals_trade_grade_check;
alter table ai_signals add constraint ai_signals_trade_grade_check check (trade_grade in ('A+', 'A', 'B', 'C'));
alter table ai_signals drop constraint if exists ai_signals_status_check;
alter table ai_signals add constraint ai_signals_status_check
  check (status in ('new', 'pending', 'open', 'tp1_hit', 'closed', 'invalidated', 'expired'));

create index if not exists ai_signals_status_idx on ai_signals (status);
create index if not exists ai_signals_coin_idx on ai_signals (coin);
create index if not exists ai_signals_created_at_idx on ai_signals (created_at desc);

-- ----------------------------------------------------------------------------
-- ai_journal — one row per CLOSED paper trade
-- ----------------------------------------------------------------------------
create table if not exists ai_journal (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid references ai_signals (id) on delete set null,
  result text not null check (result in ('win', 'loss', 'breakeven')),
  profit_percent numeric not null,             -- % of equity at time of close
  rr numeric not null,                         -- realized reward:risk multiple
  duration_minutes integer,
  notes text,
  screenshot_url text,                         -- optional trade screenshot, Supabase Storage public URL
  closed_at timestamptz not null default now()
);

-- Safe to re-run against a database created before the 2026-07 UI redesign.
alter table ai_journal add column if not exists screenshot_url text;

create index if not exists ai_journal_signal_idx on ai_journal (signal_id);
create index if not exists ai_journal_closed_at_idx on ai_journal (closed_at desc);

-- ----------------------------------------------------------------------------
-- ai_statistics — single summary row (id = 1), recomputed after every close
-- ----------------------------------------------------------------------------
create table if not exists ai_statistics (
  id smallint primary key default 1,
  total_trade integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  win_rate numeric not null default 0,          -- 0-100
  average_rr numeric not null default 0,
  profit_factor numeric not null default 0,     -- gross win / gross loss
  max_drawdown numeric not null default 0,      -- % of equity, positive number
  total_profit numeric not null default 0,      -- % of starting equity, cumulative
  updated_at timestamptz not null default now(),
  constraint ai_statistics_singleton check (id = 1)
);

-- ----------------------------------------------------------------------------
-- paper_wallet — single wallet row (id = 1)
-- ----------------------------------------------------------------------------
create table if not exists paper_wallet (
  id smallint primary key default 1,
  balance numeric not null default 10000,
  equity numeric not null default 10000,
  total_profit numeric not null default 0,
  risk_per_trade numeric not null default 1,    -- % of equity risked per trade
  auto_execute boolean not null default false,  -- when true, scan route auto-opens qualifying signals as Market orders
  auto_execute_min_grade text not null default 'A' check (auto_execute_min_grade in ('A+', 'A', 'B', 'C')),
  updated_at timestamptz not null default now(),
  constraint paper_wallet_singleton check (id = 1)
);

-- Safe to re-run against a database created before the AI Trading Terminal upgrade (2026-07, part 2).
alter table paper_wallet add column if not exists auto_execute boolean not null default false;
alter table paper_wallet add column if not exists auto_execute_min_grade text not null default 'A';
alter table paper_wallet drop constraint if exists paper_wallet_auto_execute_min_grade_check;
alter table paper_wallet add constraint paper_wallet_auto_execute_min_grade_check check (auto_execute_min_grade in ('A+', 'A', 'B', 'C'));

insert into ai_statistics (id) values (1) on conflict (id) do nothing;
insert into paper_wallet (id) values (1) on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
-- This is a single-user paper-trading tool with no login. The app's API
-- routes talk to Supabase from the server only, using SUPABASE_SERVICE_ROLE_KEY
-- (which bypasses RLS by design) — never the anon/public key from the
-- browser. RLS is enabled with zero public policies below, which blocks the
-- anon key from touching these tables at all if it ever leaked client-side.
alter table ai_signals enable row level security;
alter table ai_journal enable row level security;
alter table ai_statistics enable row level security;
alter table paper_wallet enable row level security;

-- ----------------------------------------------------------------------------
-- Storage bucket for trade screenshots (AI Journal / Paper Trader)
-- ----------------------------------------------------------------------------
-- Run once, separately, from the Supabase dashboard (Storage -> New bucket)
-- or via the CLI — bucket creation isn't a plain SQL statement:
--   1. Create a bucket named "trade-screenshots", set to Public.
--   2. No public INSERT policy needed: uploads go through
--      /api/paper-trader/journal/screenshot, a server route using the
--      service-role key, same pattern as every other write in this file.
