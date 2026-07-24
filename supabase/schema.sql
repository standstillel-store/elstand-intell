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

-- ============================================================================
-- Binance Testnet/Live Trading Engine (lib/binance/*, app/api/binance/*)
-- ============================================================================
-- Everything below this line supports REAL order execution against Binance
-- Spot/Futures Testnet (or Live, if BINANCE_MODE=live) — a different thing
-- from ai_signals/ai_journal/paper_wallet above, which stay a pure
-- simulation. Binance itself remains the source of truth for balances,
-- positions, and order status (fetched live via signed REST calls); these
-- tables only hold what Binance doesn't: our own idempotency/audit trail,
-- auto-trader configuration, per-position strategy metadata, and the
-- decision journal. Same singleton-row-by-id pattern and same RLS posture
-- (service-role key only, zero public policies) as every table above.

-- ----------------------------------------------------------------------------
-- bn_credentials — optional encrypted API key storage (Settings UI path).
-- The recommended path is still plain env vars (BINANCE_API_KEY /
-- BINANCE_SECRET_KEY), which never touch this table at all. See
-- lib/binance/credentials.ts. AES-256-GCM ciphertext only — no plaintext
-- key ever reaches Postgres, and ENCRYPTION_KEY (env-only) is required to
-- decrypt, so a DB leak alone is not enough to recover a usable key.
-- ----------------------------------------------------------------------------
create table if not exists bn_credentials (
  id smallint primary key default 1,
  api_key_encrypted jsonb not null,
  secret_key_encrypted jsonb not null,
  updated_at timestamptz not null default now(),
  constraint bn_credentials_singleton check (id = 1)
);

-- ----------------------------------------------------------------------------
-- bn_orders_log — every order ElVoid AI's Trading Engine has placed, keyed
-- by the client_order_id we generated (unique -> the idempotency guard
-- lib/binance/orderGuard.ts relies on to reject accidental double-submits).
-- Binance's own order/orderId is authoritative for live status; this row is
-- the durable record of *why* the order was placed (manual vs AI, which
-- strategy, how many confluences, the RR at entry) once Binance's own
-- history eventually ages out or gets queried per-symbol only.
-- ----------------------------------------------------------------------------
create table if not exists bn_orders_log (
  id uuid primary key default gen_random_uuid(),
  client_order_id text not null unique,
  binance_order_id bigint,
  symbol text not null,
  market text not null check (market in ('spot', 'futures')),
  mode text not null check (mode in ('testnet', 'live')),
  side text not null check (side in ('BUY', 'SELL')),
  position_side text not null default 'BOTH' check (position_side in ('LONG', 'SHORT', 'BOTH')),
  order_type text not null,
  quantity numeric not null,
  price numeric,
  stop_price numeric,
  status text not null default 'NEW',
  reduce_only boolean not null default false,
  source text not null default 'manual' check (source in ('manual', 'auto_trader', 'emergency')),
  strategy text,
  confluences integer,
  risk_percent numeric,
  risk_reward numeric,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bn_orders_log_symbol_idx on bn_orders_log (symbol);
create index if not exists bn_orders_log_created_at_idx on bn_orders_log (created_at desc);
create index if not exists bn_orders_log_source_idx on bn_orders_log (source);

-- ----------------------------------------------------------------------------
-- bn_position_meta — strategy metadata for the position currently open on a
-- symbol (one-way mode assumed, so one row per symbol at a time). Binance's
-- positionRisk endpoint has no room for "which strategy opened this" or
-- "has the stop already been moved to breakeven" — this table is exactly
-- that missing state, read/written every auto-trader tick.
-- ----------------------------------------------------------------------------
create table if not exists bn_position_meta (
  symbol text primary key,
  side text not null check (side in ('LONG', 'SHORT')),
  entry_client_order_id text,
  strategy text,
  confluences integer,
  risk_reward numeric,
  initial_entry numeric,
  initial_stop numeric,
  tp1 numeric,
  tp2 numeric,
  tp3 numeric,
  breakeven_moved boolean not null default false,
  tp1_filled boolean not null default false,
  tp2_filled boolean not null default false,
  trailing_active boolean not null default false,
  opened_by text not null default 'manual' check (opened_by in ('manual', 'auto_trader')),
  opened_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- bn_auto_trader_settings — single config row (id = 1) for the AI Auto
-- Trading loop (lib/binance/autoTrader.ts), ticked once a minute by
-- /api/binance/auto-trade/tick (Vercel Cron — see vercel.json).
-- ----------------------------------------------------------------------------
create table if not exists bn_auto_trader_settings (
  id smallint primary key default 1,
  enabled boolean not null default false,
  symbols text[] not null default array['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT'],
  timeframe text not null default '15m',
  risk_percent numeric not null default 1,
  leverage integer not null default 5,
  min_confluences integer not null default 5,
  min_risk_reward numeric not null default 3,
  max_risk_reward numeric not null default 10,
  max_concurrent_positions integer not null default 3,
  cooldown_minutes integer not null default 15,
  running boolean not null default false,
  last_run_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint bn_auto_trader_settings_singleton check (id = 1),
  constraint bn_auto_trader_settings_risk_check check (risk_percent > 0 and risk_percent <= 1),
  constraint bn_auto_trader_settings_confluence_check check (min_confluences >= 1),
  constraint bn_auto_trader_settings_rr_check check (min_risk_reward >= 3)
);

insert into bn_auto_trader_settings (id) values (1) on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- bn_auto_trader_log — append-only decision journal. Every tick writes at
-- least one row per symbol it looked at ("skip_low_confluence",
-- "entry_opened", "exit_structure_break", ...), which is what the Auto
-- Trade Log panel and the Trade Monitor's "why did it (not) act" trail
-- render. Never overwritten — this is the audit trail an autonomous
-- trading loop needs to be trustworthy.
-- ----------------------------------------------------------------------------
create table if not exists bn_auto_trader_log (
  id uuid primary key default gen_random_uuid(),
  ran_at timestamptz not null default now(),
  action text not null,
  symbol text,
  side text,
  detail text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists bn_auto_trader_log_ran_at_idx on bn_auto_trader_log (ran_at desc);
create index if not exists bn_auto_trader_log_symbol_idx on bn_auto_trader_log (symbol);

-- ----------------------------------------------------------------------------
-- bn_emergency_stop — global kill-switch (id = 1). When stopped = true, the
-- auto-trader tick refuses to open new positions (existing positions can
-- still be closed/managed manually) until cleared from the dashboard.
-- ----------------------------------------------------------------------------
create table if not exists bn_emergency_stop (
  id smallint primary key default 1,
  stopped boolean not null default false,
  reason text,
  updated_at timestamptz not null default now(),
  constraint bn_emergency_stop_singleton check (id = 1)
);

insert into bn_emergency_stop (id) values (1) on conflict (id) do nothing;

alter table bn_credentials enable row level security;
alter table bn_orders_log enable row level security;
alter table bn_position_meta enable row level security;
alter table bn_auto_trader_settings enable row level security;
alter table bn_auto_trader_log enable row level security;
alter table bn_emergency_stop enable row level security;

-- ============================================================================
-- Phase 3 — Authentication & User System
-- ============================================================================
-- Adds a genuinely per-user layer on top of Supabase Auth's own auth.users
-- (populated by "Continue with Google" — see lib/auth/*, app/login/page.tsx,
-- app/auth/callback/route.ts). Everything below uses REAL Row Level Security
-- policies keyed off auth.uid(), which is the opposite RLS posture from
-- every table above: those are single-tenant singletons (id = 1, no user_id
-- at all) read/written only by the server via SUPABASE_SERVICE_ROLE_KEY, so
-- "RLS enabled with zero policies" was the correct way to lock the anon key
-- out entirely. These new tables are the opposite case — actual per-user
-- data the browser's own anon-key session is supposed to read/write, scoped
-- to auth.uid() — so real ownership policies are what "Supabase RLS" means
-- here.
--
-- NOT included: paper_wallet is NOT migrated to a per-user table here, even
-- though the Phase 3 brief lists it alongside users/profile/wallet/device/
-- ai_token/settings/activity_log. paper_wallet (plus ai_signals, ai_journal,
-- ai_statistics — the rest of the Paper Trader engine it can't be separated
-- from) is currently one shared singleton by design, wired through
-- lib/elvoid/paperTrader.ts and every /api/paper-trader/* route. Adding a
-- user_id column to paper_wallet alone, without also migrating ai_signals/
-- ai_journal/ai_statistics and every route + component that reads them,
-- would produce a half-migrated feature (a personal balance sitting on top
-- of trade history that's still shared by everyone) — worse than what
-- exists today. That's a real, separate project (touches the whole trading
-- engine, not just auth), so it isn't done silently as a side effect of
-- this migration. See the chat reply this schema shipped with for the full
-- explanation; happy to scope that as its own phase on request.
-- ----------------------------------------------------------------------------
-- users / profiles — one row each per auth.users row, created and refreshed
-- on every login (see lib/auth/profile.ts -> upsertUserProfile(), called
-- from app/auth/callback/route.ts). Two tables because the brief asked for
-- both by name: `users` is the auth-adjacent identity/activity record,
-- `profiles` is the display-facing extension (username/avatar). In practice
-- they're 1:1 and always written together — kept separate so `profiles`
-- could later grow public-readable columns (e.g. a public profile page)
-- without ever exposing anything from `users`.
-- ----------------------------------------------------------------------------
create table if not exists users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  last_login_at timestamptz,
  last_active_at timestamptz
);

create table if not exists profiles (
  user_id uuid primary key references users (id) on delete cascade,
  username text,
  avatar_url text,
  updated_at timestamptz not null default now()
);

alter table users enable row level security;
alter table profiles enable row level security;

drop policy if exists users_select_own on users;
create policy users_select_own on users for select using (auth.uid() = id);
drop policy if exists users_insert_own on users;
create policy users_insert_own on users for insert with check (auth.uid() = id);
drop policy if exists users_update_own on users;
create policy users_update_own on users for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists profiles_select_own on profiles;
create policy profiles_select_own on profiles for select using (auth.uid() = user_id);
drop policy if exists profiles_insert_own on profiles;
create policy profiles_insert_own on profiles for insert with check (auth.uid() = user_id);
drop policy if exists profiles_update_own on profiles;
create policy profiles_update_own on profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- wallets — connected EVM wallets (MetaMask, Rabby, OKX Wallet, Coinbase
-- Wallet, or anything reachable via WalletConnect — see lib/web3/config.ts).
-- Ownership is proven with a signed-message challenge BEFORE a row is ever
-- written (app/api/wallet/verify/route.ts) — this table never sees a
-- private key or mnemonic, only a public address plus the one-time
-- signature that proved control of it at connect time. wallet_address is
-- globally unique on purpose (not just unique per-user): once verified, one
-- address should never be able to sit "connected" under two accounts at once.
-- ----------------------------------------------------------------------------
create table if not exists wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  wallet_address text not null,
  wallet_type text not null check (wallet_type in ('metamask', 'rabby', 'okx', 'coinbase', 'walletconnect', 'other')),
  chain_id integer not null,
  verified boolean not null default false,
  first_connected_at timestamptz not null default now(),
  last_connected_at timestamptz not null default now(),
  constraint wallets_address_unique unique (wallet_address)
);

create index if not exists wallets_user_id_idx on wallets (user_id);

alter table wallets enable row level security;
drop policy if exists wallets_select_own on wallets;
create policy wallets_select_own on wallets for select using (auth.uid() = user_id);
drop policy if exists wallets_insert_own on wallets;
create policy wallets_insert_own on wallets for insert with check (auth.uid() = user_id);
drop policy if exists wallets_update_own on wallets;
create policy wallets_update_own on wallets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists wallets_delete_own on wallets;
create policy wallets_delete_own on wallets for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- devices — a login HISTORY, not a live session table. Being direct about a
-- real limit: Supabase Auth doesn't expose a client-safe "list every active
-- session by device and revoke just this one" API. The real primitives are
-- supabase.auth.signOut({ scope }) with 'local' (this device only), 'others'
-- (every OTHER device), or 'global' (all devices) — which is what Settings >
-- Security actually calls. This table lets that screen show *where* logins
-- came from (device/browser/OS, first seen, last seen) without pretending
-- to offer per-device revoke that the underlying auth system doesn't support.
-- ----------------------------------------------------------------------------
create table if not exists devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  device_label text not null,
  user_agent text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint devices_user_label_unique unique (user_id, device_label)
);

create index if not exists devices_user_id_idx on devices (user_id, last_seen_at desc);

alter table devices enable row level security;
drop policy if exists devices_select_own on devices;
create policy devices_select_own on devices for select using (auth.uid() = user_id);
drop policy if exists devices_insert_own on devices;
create policy devices_insert_own on devices for insert with check (auth.uid() = user_id);
drop policy if exists devices_update_own on devices;
create policy devices_update_own on devices for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- ai_token / ai_token_transactions — "AI Energy". 10 free, refilled by
-- checking last_reset_at every time balance is read or spent (lib/energy.ts)
-- rather than a cron job — correct whether someone opens the app once an
-- hour or once a week, and needs no extra scheduled infrastructure. Every
-- grant/spend appends a row to ai_token_transactions, so the balance is
-- always independently reconstructable from the log, not just trusted.
-- ----------------------------------------------------------------------------
create table if not exists ai_token (
  user_id uuid primary key references users (id) on delete cascade,
  balance integer not null default 10,
  last_reset_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_token_balance_non_negative check (balance >= 0)
);

create table if not exists ai_token_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  delta integer not null,               -- negative = spend, positive = grant / daily reset
  reason text not null,                 -- e.g. "chat", "ai_signal_scan", "chart_analysis", "daily_reset"
  balance_after integer not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_token_transactions_user_id_idx on ai_token_transactions (user_id, created_at desc);

alter table ai_token enable row level security;
alter table ai_token_transactions enable row level security;

drop policy if exists ai_token_select_own on ai_token;
create policy ai_token_select_own on ai_token for select using (auth.uid() = user_id);
drop policy if exists ai_token_insert_own on ai_token;
create policy ai_token_insert_own on ai_token for insert with check (auth.uid() = user_id);
drop policy if exists ai_token_update_own on ai_token;
create policy ai_token_update_own on ai_token for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists ai_token_tx_select_own on ai_token_transactions;
create policy ai_token_tx_select_own on ai_token_transactions for select using (auth.uid() = user_id);
drop policy if exists ai_token_tx_insert_own on ai_token_transactions;
create policy ai_token_tx_insert_own on ai_token_transactions for insert with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- user_settings — account-level toggles that Phase 3 itself introduces
-- (security/wallet notifications, plus a jsonb escape hatch for whatever
-- Phase 4 needs without another migration). NOT the same thing as the
-- existing General/Appearance preferences already in Settings (language,
-- timezone, currency, theme) — those stay local-only via usePreferences()
-- (lib/hooks/usePreferences.ts, browser localStorage) on purpose, to avoid
-- folding an unrelated, already-working system into this migration.
-- ----------------------------------------------------------------------------
create table if not exists user_settings (
  user_id uuid primary key references users (id) on delete cascade,
  security_alerts boolean not null default true,
  wallet_notifications boolean not null default true,
  extra jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table user_settings enable row level security;
drop policy if exists user_settings_select_own on user_settings;
create policy user_settings_select_own on user_settings for select using (auth.uid() = user_id);
drop policy if exists user_settings_insert_own on user_settings;
create policy user_settings_insert_own on user_settings for insert with check (auth.uid() = user_id);
drop policy if exists user_settings_update_own on user_settings;
create policy user_settings_update_own on user_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- activity_log — append-only audit trail (login, logout, wallet_connected,
-- wallet_disconnected, energy_spent, settings_changed, account_delete_requested,
-- ...). Same spirit as bn_auto_trader_log above: never overwritten, always
-- additive, and it's what a future "recent activity" list in Settings reads.
-- ----------------------------------------------------------------------------
create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  event_type text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_log_user_id_idx on activity_log (user_id, created_at desc);

alter table activity_log enable row level security;
drop policy if exists activity_log_select_own on activity_log;
create policy activity_log_select_own on activity_log for select using (auth.uid() = user_id);
drop policy if exists activity_log_insert_own on activity_log;
create policy activity_log_insert_own on activity_log for insert with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Payment preparation (brief section 7) — schema only, nothing writes to
-- these yet and no payment logic is wired up anywhere ("Jangan implementasi
-- pembayaran dulu"). payment_provider / transaction_status are small
-- reference/lookup tables (seeded below, everything inactive) so the real
-- tables get a proper foreign key instead of a bare check constraint that
-- would need editing in three places every time a provider/status is added.
-- ----------------------------------------------------------------------------
create table if not exists payment_provider (
  provider_code text primary key,
  label text not null,
  is_active boolean not null default false
);

insert into payment_provider (provider_code, label, is_active) values
  ('stripe', 'Stripe', false),
  ('midtrans', 'Midtrans', false),
  ('crypto', 'Crypto (on-chain top-up)', false)
on conflict (provider_code) do nothing;

create table if not exists transaction_status (
  status_code text primary key,
  label text not null
);

insert into transaction_status (status_code, label) values
  ('pending', 'Pending'),
  ('completed', 'Completed'),
  ('failed', 'Failed'),
  ('refunded', 'Refunded'),
  ('cancelled', 'Cancelled')
on conflict (status_code) do nothing;

create table if not exists payment_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  provider_code text references payment_provider (provider_code),
  status_code text not null default 'pending' references transaction_status (status_code),
  amount numeric not null,
  currency text not null default 'USD',
  external_reference text,
  created_at timestamptz not null default now()
);

create table if not exists topup_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  provider_code text references payment_provider (provider_code),
  status_code text not null default 'pending' references transaction_status (status_code),
  amount numeric not null,
  currency text not null default 'USD',
  created_at timestamptz not null default now()
);

create table if not exists wallet_topup (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  wallet_id uuid references wallets (id) on delete set null,
  amount numeric not null,
  currency text not null default 'USD',
  tx_hash text,
  status_code text not null default 'pending' references transaction_status (status_code),
  created_at timestamptz not null default now()
);

create index if not exists payment_history_user_id_idx on payment_history (user_id, created_at desc);
create index if not exists topup_history_user_id_idx on topup_history (user_id, created_at desc);
create index if not exists wallet_topup_user_id_idx on wallet_topup (user_id, created_at desc);

alter table payment_provider enable row level security;
alter table transaction_status enable row level security;
alter table payment_history enable row level security;
alter table topup_history enable row level security;
alter table wallet_topup enable row level security;

-- Reference tables: readable by any signed-in user, writable by no one from the client.
drop policy if exists payment_provider_read_all on payment_provider;
create policy payment_provider_read_all on payment_provider for select using (auth.role() = 'authenticated');
drop policy if exists transaction_status_read_all on transaction_status;
create policy transaction_status_read_all on transaction_status for select using (auth.role() = 'authenticated');

-- Own-rows-only, SELECT ONLY from the client — nothing writes to these three
-- yet since no payment logic exists. Phase 4's payment routes will write via
-- the service-role key, the same way ai_signals/paper_wallet already do,
-- which bypasses RLS by design (see the note near the top of this file).
drop policy if exists payment_history_select_own on payment_history;
create policy payment_history_select_own on payment_history for select using (auth.uid() = user_id);
drop policy if exists topup_history_select_own on topup_history;
create policy topup_history_select_own on topup_history for select using (auth.uid() = user_id);
drop policy if exists wallet_topup_select_own on wallet_topup;
create policy wallet_topup_select_own on wallet_topup for select using (auth.uid() = user_id);
