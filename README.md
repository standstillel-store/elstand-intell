# ELSTAND INTELLIGENCE — ElVoid AI Crypto Terminal

A dark, terminal-styled crypto intelligence dashboard: a live crypto
heatmap, AI trade signals with a full reasoning breakdown, a rule-based
pump/dump/rugpull/smart-money Token Scanner, whale flow, funding rates,
market sentiment, an economic calendar, and **ElVoid AI Paper Trader** — a
transparent signal engine with a full paper-trading simulator — aggregated
from free public APIs. Built with Next.js 14 (App Router) + TypeScript +
Tailwind + Framer Motion + Supabase.

## Before you launch this publicly — please read

**No system — this one included — can reliably predict which coin will 10x
or 100x, or whether a signal will hit Take Profit or Stop Loss.** Crypto
markets are driven by hype, liquidity, and sometimes outright manipulation.
What this app actually does is surface **transparent, rule-based signals**
from public data — a research aid and a paper-trading sandbox, not a
crystal ball.

If you plan to share this with other people:
- Keep every "not financial advice" / "paper trading only" disclaimer
  visible (they're already in the UI — please don't remove them).
- Don't market scores or ElVoid AI signals as guarantees. A signal with 78%
  confidence should read as "worth a closer look," never as "will win."
- **ElVoid AI Paper Trader never touches real funds and is never connected
  to a real exchange.** It's a simulation with a virtual wallet — keep it
  that way if you extend it. **Portfolio** is the same paper wallet viewed
  through an allocation lens, not a real wallet-connect integration.
- The rugpull-risk heuristic is a starting point (liquidity ratios, pool
  age, whale exits, negative news), not a security audit. Always tell users
  to verify independently (check contract, liquidity lock, team, audits).
- The **SMT (Smart Money Divergence)** reasoning line is an intentionally
  simplified proxy — it compares 24h/7d relative strength against BTC,
  not a full cross-pair swing-structure comparison. It's labeled clearly in
  the UI so it's never mistaken for more precision than it has.
- **DXY** on the Market Overview strip is the Fed's Broad Trade-Weighted
  USD Index (FRED series `DTWEXBGS`), used as a free proxy for the ICE US
  Dollar Index — not the literal DXY ticker. Labeled as such in the UI.

## Security note on API keys

Whatever keys you use, keep them only in `.env.local` (already git-ignored)
and never in client-side code or anything you commit/share. If any key was
ever typed into a chat conversation, treat it as potentially exposed and
rotate it from the provider's dashboard before relying on this in
production.

## What's wired up

| Source | Used for | Key needed? |
|---|---|---|
| CoinGecko | Market data, prices, market cap, 1h/24h/7d change | No |
| Binance Futures | Funding rate, open interest, and OHLCV candles (ElVoid AI) | No |
| Alternative.me | Fear & Greed index | No |
| GeckoTerminal | DEX volume, liquidity & FDV (eth, bsc, solana, base, arbitrum) | No |
| DefiLlama | Stablecoin Supply market-overview card | No |
| FRED (St. Louis Fed) | DXY (Broad USD Index proxy) & M2 Money Supply | Yes — free |
| Alchemy | Whale transfer feed (curated ERC-20 watchlist) | Yes — free tier |
| NewsAPI.org | News feed, feeds rugpull "negative press" + ElVoid AI News Sentiment | Yes — free tier (localhost only; use a paid tier or GNews for production) |
| ForexFactory calendar feed | Economic calendar (FOMC/CPI/NFP-style high-impact events) | No |
| Supabase | Persistence for ElVoid AI Paper Trader (signals, journal, statistics, wallet, trade screenshots) | Yes — free tier |

Everything degrades gracefully: if a key is missing or an API call fails,
that widget just shows an empty/"not configured" state instead of crashing
the page. `FRED_API_KEY` is the only genuinely optional one — without it the
DXY and M2 cards simply show a placeholder.

## What's new in the 2026-07 terminal redesign

- **Top Navigation** — logo, ElVoid AI search (type a symbol to open the
  Token Analyzer from anywhere), live BTC/ETH/SOL ticker, profile menu.
  Global, on every page (`components/layout/TopNav.tsx`).
- **Market Overview strip** — Fear & Greed, BTC Dominance, Altseason Index,
  Total Market Cap, Macro Event, Stablecoin Supply, DXY, M2 — eight cards,
  always visible, no accordion.
- **Crypto Heatmap** — a big, central, bucketed-treemap heatmap. Green =
  bullish, red = bearish, purple = high rugpull risk, blue = smart-money
  accumulation. Click any tile to open the Token Analyzer.
- **Token Analyzer** — a slide-over drawer (`components/token-analyzer/`)
  with price, liquidity, FDV, volume, Pump/Dump/Rugpull/Smart Money scores,
  AI summary, news, and related economic-calendar events. Opens from the
  heatmap, the Token Scanner, or the search bar.
- **AI Signal Panel redesign** — LONG/SHORT, Confidence, Entry, SL,
  TP1/TP2/TP3, RR per target, Timeframe, Status (Running/Win/Loss), and a
  10-item **AI Reasoning** checklist (Support/Resistance, Order Block,
  Liquidity Sweep, SMT, BOS/CHoCH, Fair Value Gap, Volume Confirmation,
  Funding, Open Interest, Whale Flow) — `components/ai-signal-pro/SignalCardPro.tsx`.
- **Token Scanner** — 7 live categories: Top Pump Candidate, Top Dump
  Candidate, Top Rugpull Risk, Smart Money Accumulation, High Momentum,
  Whale Buying, Whale Selling (`lib/scanner-categories.ts`, `/scanner`).
- **Paper Trader** — added explicit Max Drawdown / Total Trade stat cards
  and a trade **screenshot** field (Supabase Storage — see setup below).
- **AI Journal** — now has a Performance tab (merged from the old
  `/ai-performance` page) plus strategy and timeframe filters and inline
  screenshot viewing.
- **Portfolio** (`/portfolio`) — new page: an allocation view over the
  Paper Trader wallet's open positions.
- Framer Motion throughout: live-updating numbers, card hover glow, loading
  skeletons, staggered entrance animation, animated confidence/score bars.

## AI chat dock — free, no LLM API

The chat — both the floating dock on every page and the inline **ElVoid AI
Chat** panel on the Home dashboard's right rail — runs entirely on this
app's own **rule-based Intelligence Engine** (`lib/analysis.ts`): it reads
the same live snapshot the dashboard renders and turns it into a structured
answer — Market Summary, Whale Activity, Risk Analysis, Momentum, News
Impact, Final Conclusion — with **zero API cost and no key required**. Ask
it things like "analisa BTC", "whale activity", "risk tertinggi", or
"ringkasan market". Both surfaces share one hook (`lib/hooks/useElVoidChat.ts`)
so there's a single source of truth for the chat logic.

It does not use a language model, so it won't handle open-ended conversation
the way ChatGPT would — it's an interpreter over the data, not a chatbot.
That's the tradeoff for keeping it free. ElVoid AI Paper Trader's signal
engine follows the exact same philosophy: plain, explainable rules over live
data, no black box, no per-request LLM cost.

## Setup

```bash
npm install
cp .env.local.example .env.local
# open .env.local and fill in the keys you want (see table above) —
# CoinGecko/Binance/Fear&Greed/GeckoTerminal/ForexFactory/DefiLlama work with no key
npm run dev
```

Open http://localhost:3000.

### Setting up Supabase for ElVoid AI Paper Trader & AI Journal

Without Supabase, Paper Trader still generates signals and computes trades
for a single session, but nothing is remembered after a server restart.
To persist it:

1. Create a free project at https://supabase.com.
2. Open the SQL Editor and run the contents of `supabase/schema.sql` once —
   it creates `ai_signals`, `ai_journal`, `ai_statistics`, and
   `paper_wallet`, and is safe to re-run (including on a database created
   before this redesign — the `alter table ... add column if not exists`
   lines backfill `tp3`, `timeframe`, `scans`, `extra_reasoning`, and
   `screenshot_url`).
3. In your Supabase project settings, copy the **Project URL** and the
   **service_role key** (Settings → API).
4. Add them to `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
5. **For trade screenshots**: in the Supabase dashboard, go to Storage →
   New bucket → name it `trade-screenshots` → set it **Public**. No policy
   setup needed — uploads go through `/api/paper-trader/journal/screenshot`,
   a server route using the service-role key.
6. Restart `npm run dev`. Check **Settings** in the app — it shows live
   connection status for Supabase, Alchemy, NewsAPI, and FRED without
   exposing any key.

The service-role key is used **server-side only** (Route Handlers / Server
Components) and bypasses Row Level Security by design — never expose it to
the browser or use the anon key for these tables. See the RLS note at the
bottom of `supabase/schema.sql`.

### Optional: FRED for DXY & M2

1. Register a free key at https://fred.stlouisfed.org/docs/api/api_key.html.
2. Add `FRED_API_KEY=your-key` to `.env.local`.
3. Without it, the DXY and M2 cards on the Market Overview strip show a
   "belum dikonfigurasi" placeholder instead of breaking.

## Deploying

This is a standard Next.js app, so it deploys as-is to Vercel, Railway,
Render, or any Node host:

```bash
npm run build
npm start
```

On Vercel: push to a git repo, import it, and add the same environment
variables from `.env.local` in the project's Settings → Environment
Variables (never commit the real `.env.local` file itself).

Note: the in-memory cache in `lib/cache.ts` helps most on a long-running
server. On serverless platforms, each cold start gets a fresh cache, so
you'll lean more on the free tiers' own rate limits — the numbers used here
(45–120s TTLs; 6–12h for the slow-moving DXY/M2 macro series) are
conservative but adjust if you hit limits.

## Project structure

```
app/
  page.tsx                Home dashboard — desktop terminal layout + MobileHome
  layout.tsx               Root layout, fonts, metadata, Token Analyzer provider
  globals.css               Terminal theme, glow/skeleton/heatmap primitives
  ai-signal/                 AI Signal scanner page
  paper-trader/               ElVoid AI Paper Trader dashboard
  ai-journal/                  Trade history + Performance tabs
  ai-performance/                Redirects to /ai-journal (merged in 2026-07)
  scanner/                         Token Scanner — 7 live categories
  portfolio/                        Paper wallet allocation view
  whale/                              Full whale transfer feed, buy/sell split
  news/                                Full news feed with sentiment filter
  economic-calendar/                    Full week of macro events
  settings/                              Risk %, integration status, reset
  methodology/                            How scoring + ElVoid AI works
  api/
    ticker/                                          BTC/ETH/SOL for TopNav
    market/ funding/ feargreed/ dex/ news/ whales/    Data source proxies
    pump-candidates/ rugpull-risk/                    Combined + scored lists
    chat/                                             Rule-based AI chat
    ai-signals/ (+ scan/)                              Generate/list signals
    paper-trader/ (wallet/ execute/ close/ sync/       Paper trading engine
                   reset/ stats/ journal/screenshot/)   + screenshot upload
    ai-journal/                                        Journal entries
    ai-performance/                                    Analytics report
    settings/status/                                   Integration status
    token-analysis/                                     Token Analyzer data
components/
  layout/                 TopNav (global top bar)
  ui/                      GlowCard, Badge, LiveDot, Skeleton, AnimatedNumber
  heatmap/                  CryptoHeatmap
  token-analyzer/            Context + slide-over drawer
  market/                     MarketOverviewStrip
  ai-signal-pro/                SignalCardPro (flagship signal card)
  right-rail/                    ElVoid AI Chat, AI Summary, Macro/Whale Alert,
                                  Economic Calendar mini, Breaking News mini
  scanner/                         Token Scanner teaser (Home) + full view
  portfolio/                        Allocation view
  whale/                              Whale Activity view (buy/sell split)
  paper-trader/ ai-journal/ ai-performance/ settings/ news/  Feature components
lib/                      API clients, types, formatting, scoring engine
  elvoid/                 ElVoid AI: scanners, engine, paper trading, math
  scanner-categories.ts    Token Scanner's 7 categories (dump/momentum/whale/smart money)
  stablecoins.ts            DefiLlama stablecoin supply
  macro.ts                   FRED DXY-proxy & M2
  dashboardSnapshot.ts         Aggregates everything the Home dashboard needs
  hooks/useElVoidChat.ts        Shared chat hook (dock + inline panel)
supabase/
  schema.sql              Run once in the Supabase SQL editor
```

## Extending the scoring engine

The Token Scanner's pump/rugpull/dump/smart-money "intelligence" lives in
`lib/scoring.ts` and `lib/scanner-categories.ts` — plain functions that take
arrays of already-fetched data and return a scored, sorted, reasoned list.
No black box: every point added to a score has a comment explaining why.

ElVoid AI Paper Trader's engine lives in `lib/elvoid/`:
- `indicators.ts` — EMA/RSI/ATR, swing points, support/resistance clustering, trend, volume anomaly.
- `scanners.ts` — the original 9 directional scan categories (feed Confidence) plus 5 extended,
  presentational-only reasoning scanners added in 2026-07 (Fair Value Gap, Order Block, Funding,
  Open Interest, SMT) that power the AI Reasoning checklist without touching the confidence math.
- `engine.ts` — orchestrates the scanners into a LONG/SHORT signal with Entry/SL/TP1/TP2/TP3/Confidence.
- `paperTrader.ts` — wallet, trade execution/close lifecycle, TP/SL evaluation, statistics.
- `performance.ts` — strategy/coin/setup analytics and the confidence-calibration feed.
- `service.ts` — wires live data sources (including BTC's own change % for the SMT reasoning line)
  into the engine for one coin or the whole watchlist.

That's the first place to look if you want to tune weights, add new
scanners, or adjust thresholds.

## What's intentionally left as an MVP

- **Rugpull detection** doesn't yet check holder concentration or contract
  verification/honeypot status — those need extra on-chain calls per token.
  Token Analyzer's **Holders** and **Next Unlock** fields are left `null`
  (never a fabricated number) until a provider is wired in.
- **SMT (Smart Money Divergence)** is a simplified 24h/7d-vs-BTC proxy, not
  a full cross-pair swing-structure comparison — see the note at the top of
  this README.
- **Liquidation Heatmap** was requested but isn't wired up — every free
  liquidation-heatmap source (Coinglass, etc.) requires a paid API tier, and
  this app's rule is to never fabricate placeholder data. Settings will show
  a "not connected" state if you add this later.
- **Whale feed** watches a small starter list of major ERC-20 contracts on
  Ethereum mainnet — extend `lib/alchemy.ts`'s `WATCHLIST`, or add another
  Alchemy network URL, to cover more chains/tokens.
- **ElVoid AI's watchlist** (`lib/elvoid/watchlist.ts`) covers 15 liquid
  Binance Futures pairs — add symbols there to scan more coins, as long as
  they have a `<SYMBOL>USDT` pair on Binance Futures.
- **Paper Trader position sizing** is risk-based (risk % of equity ÷ stop
  distance) rather than fixed lot sizes — realistic for comparing setups,
  but doesn't model slippage, fees, or partial fills beyond the TP1→breakeven
  rule.
- **Portfolio** reflects the paper-trading wallet only — there's no real
  exchange or on-chain wallet-connect integration in this app.
