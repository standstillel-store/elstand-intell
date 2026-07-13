# Nocturn — AI Crypto Intelligence

A dark, terminal-styled AI crypto intelligence platform: momentum and
rugpull-risk scoring, whale flow, funding rates, market sentiment, an
economic calendar, and **ElVoid AI Paper Trader** — a rule-based signal
engine with a full paper-trading simulator — aggregated from free public
APIs. Built with Next.js 14 (App Router) + TypeScript + Tailwind + Supabase.

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
  that way if you extend it.
- The rugpull-risk heuristic is a starting point (liquidity ratios, pool
  age, whale exits, negative news), not a security audit. Always tell users
  to verify independently (check contract, liquidity lock, team, audits).

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
| GeckoTerminal | DEX volume & liquidity (eth, bsc, solana, base, arbitrum) | No |
| Alchemy | Whale transfer feed (curated ERC-20 watchlist) | Yes — free tier |
| NewsAPI.org | News feed, feeds rugpull "negative press" + ElVoid AI News Sentiment | Yes — free tier (localhost only; use a paid tier or GNews for production) |
| ForexFactory calendar feed | Economic calendar (FOMC/CPI/NFP-style high-impact events) | No |
| Supabase | Persistence for ElVoid AI Paper Trader (signals, journal, statistics, wallet) | Yes — free tier |

## AI chat dock — free, no LLM API

The chat dock runs entirely on Nocturn's own **rule-based Intelligence
Engine** (`lib/analysis.ts`): it reads the same live snapshot the dashboard
renders and turns it into a structured answer — Market Summary, Whale
Activity, Risk Analysis, Momentum, News Impact, Final Conclusion — with
**zero API cost and no key required**. Ask it things like "analisa BTC",
"whale activity", "risk tertinggi", or "ringkasan market".

It does not use a language model, so it won't handle open-ended conversation
the way ChatGPT would — it's an interpreter over the data, not a chatbot.
That's the tradeoff for keeping it free. ElVoid AI Paper Trader's signal
engine follows the exact same philosophy: plain, explainable rules over live
data, no black box, no per-request LLM cost.

Everything degrades gracefully: if a key is missing or an API call fails,
that widget just shows an empty/fallback state instead of crashing the page.

## Setup

```bash
npm install
cp .env.local.example .env.local
# open .env.local and fill in the keys you want (see table above) —
# CoinGecko/Binance/Fear&Greed/GeckoTerminal/ForexFactory work with no key
npm run dev
```

Open http://localhost:3000.

### Setting up Supabase for ElVoid AI Paper Trader

Without Supabase, Paper Trader still generates signals and computes trades
for a single session, but nothing is remembered after a server restart.
To persist it:

1. Create a free project at https://supabase.com.
2. Open the SQL Editor and run the contents of `supabase/schema.sql` once —
   it creates `ai_signals`, `ai_journal`, `ai_statistics`, and
   `paper_wallet`, and is safe to re-run.
3. In your Supabase project settings, copy the **Project URL** and the
   **service_role key** (Settings → API).
4. Add them to `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
5. Restart `npm run dev`. Check **Settings** in the app — it shows live
   connection status for Supabase, Alchemy, and NewsAPI without exposing any
   key.

The service-role key is used **server-side only** (Route Handlers / Server
Components) and bypasses Row Level Security by design — never expose it to
the browser or use the anon key for these tables. See the RLS note at the
bottom of `supabase/schema.sql`.

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
(45–120s TTLs) are conservative but adjust if you hit limits.

## Project structure

```
app/
  page.tsx                Dashboard (server component, fetches everything)
  layout.tsx               Root layout, fonts, metadata
  globals.css               Terminal theme
  ai-signal/                 AI Signal scanner page
  paper-trader/               ElVoid AI Paper Trader dashboard
  ai-journal/                  Full paper-trade history
  ai-performance/                Strategy/coin/setup analytics
  whale/                          Full whale transfer feed
  news/                             Full news feed with sentiment filter
  economic-calendar/                 Full week of macro events
  settings/                           Risk %, integration status, reset
  methodology/                         How scoring + ElVoid AI works
  api/
    market/ funding/ feargreed/ dex/ news/ whales/    Data source proxies
    pump-candidates/ rugpull-risk/                    Combined + scored lists
    chat/                                             Rule-based AI chat
    ai-signals/ (+ scan/)                              Generate/list signals
    paper-trader/ (wallet/ execute/ close/ sync/       Paper trading engine
                   reset/ stats/)
    ai-journal/                                        Journal entries
    ai-performance/                                    Analytics report
    settings/status/                                   Integration status
components/               UI panels (mostly dumb, just render props)
  paper-trader/ ai-signal/ ai-journal/ ai-performance/  Feature components
  settings/ news/
lib/                      API clients, types, formatting, scoring engine
  elvoid/                 ElVoid AI: scanners, engine, paper trading, math
supabase/
  schema.sql              Run once in the Supabase SQL editor
```

## Extending the scoring engine

The Dashboard's pump/rugpull "intelligence" lives in `lib/scoring.ts` — two
plain functions that take arrays of already-fetched data and return a
scored, sorted, reasoned list. No black box: every point added to a score
has a comment explaining why.

ElVoid AI Paper Trader's engine follows you to `lib/elvoid/`:
- `indicators.ts` — EMA/RSI/ATR, swing points, support/resistance clustering, trend, volume anomaly.
- `scanners.ts` — the 10 required scan categories, each a small pure function.
- `engine.ts` — orchestrates the scanners into a LONG/SHORT signal with Entry/SL/TP1/TP2/Confidence.
- `paperTrader.ts` — wallet, trade execution/close lifecycle, TP/SL evaluation, statistics.
- `performance.ts` — strategy/coin/setup analytics and the confidence-calibration feed.
- `service.ts` — wires live data sources into the engine for one coin or the whole watchlist.

That's the first place to look if you want to tune weights, add new
scanners, or adjust thresholds.

## What's intentionally left as an MVP

- **Rugpull detection** doesn't yet check holder concentration or contract
  verification/honeypot status — those need extra on-chain calls per token.
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
