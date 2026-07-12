# Noctrun AI

A dark, terminal-styled crypto dashboard: pump-signal scoring, rugpull risk
scoring, whale flow, funding rates, and market sentiment, aggregated from
free public APIs. Built with Next.js 14 (App Router) + TypeScript + Tailwind.

## Before you launch this publicly — please read

**No system — this one included — can reliably predict which coin will 10x
or 100x.** Crypto pumps are driven mostly by hype, liquidity, and sometimes
outright manipulation; even well-resourced trading funds get this wrong
often. What this app actually does is surface **transparent, rule-based
signals** from public data (momentum, volume/liquidity ratios, whale flow,
funding rates, sentiment) — a research aid, not a crystal ball.

If you plan to share this with other people:
- Keep the "not financial advice" disclaimer visible (it's already in the UI
  — please don't remove it).
- Don't market the scores as guarantees. "82/100 pump score" should read as
  "worth a closer look," never as "will pump."
- The rugpull-risk heuristic is a starting point (liquidity ratios, pool
  age, whale exits, negative news), not a security audit. It will miss real
  rugs and flag legitimate low-liquidity tokens. Always tell users to verify
  independently (check contract, liquidity lock, team, audits).

## Security note on the Alchemy key

The Alchemy key from our chat is **not** included in this zip — you'll paste
it into `.env.local` yourself (see Setup below). Because it was typed into a
chat conversation, treat it as potentially exposed: it's good practice to
regenerate/rotate it from your [Alchemy dashboard](https://dashboard.alchemy.com)
before relying on this in production. Whichever key you end up using, keep
it only in `.env.local` (already git-ignored) and never in client-side code
or anything you commit/share.

## What's wired up

| Source | Used for | Key needed? |
|---|---|---|
| CoinGecko | Market data, prices, market cap, 1h/24h/7d change | No |
| Binance Futures | Funding rate + open interest (curated watchlist) | No |
| Alternative.me | Fear & Greed index | No |
| GeckoTerminal | DEX volume & liquidity (eth, bsc, solana, base, arbitrum) | No |
| Alchemy | Whale transfer feed (curated ERC-20 watchlist) | Yes — already set |
| NewsAPI.org | News feed, feeds the rugpull "negative press" flag | Yes — free tier, you add it |
| ForexFactory calendar feed | Economic calendar (FOMC/CPI/NFP-style high-impact events) | No |

## AI chat dock — free, no LLM API

The chat dock used to call the OpenAI API, which costs money per request.
It now runs entirely on Nocturn's own **rule-based Intelligence Engine**
(`lib/analysis.ts`): it reads the same live snapshot the dashboard renders
(Fear & Greed, whale flow, pump score, rugpull score, funding/OI, news,
economic calendar) and turns it into a structured answer — Market Summary,
Whale Activity, Risk Analysis, Momentum, News Impact, Final Conclusion —
with **zero API cost and no key required**. Ask it things like "analisa
ALLO", "whale activity", "risk tertinggi", or just "ringkasan market".

It does not use a language model, so it won't handle open-ended conversation
the way ChatGPT would — it's an interpreter over the data, not a chatbot.
That's the tradeoff for keeping it free.

Everything degrades gracefully: if a key is missing or an API call fails,
that widget just shows an empty/fallback state instead of crashing the page.

## Setup

```bash
npm install
cp .env.local.example .env.local
# then open .env.local and paste in your Alchemy key (see security note above
# about rotating it first) — everything else works with no key at all
npm run dev
```

Open http://localhost:3000.

To get the news feed working, grab a free key at
https://cryptopanic.com/developers/api/ and drop it into
`CRYPTOPANIC_API_KEY` in `.env.local`.

To make the "Ask Noctrun AI" chat dock give real analysis instead of a raw
JSON fallback, add `ANTHROPIC_API_KEY` from https://console.anthropic.com
(this is a paid, pay-as-you-go API — check current model names at
https://docs.claude.com since they change over time).

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
  page.tsx              Home page (server component, fetches everything)
  layout.tsx            Root layout, fonts, metadata
  globals.css           Terminal theme
  api/
    market/             CoinGecko proxy
    funding/            Binance funding + OI proxy
    feargreed/          Alternative.me proxy
    dex/                GeckoTerminal proxy
    news/               CryptoPanic proxy
    whales/             Alchemy whale feed proxy
    pump-candidates/    Combined + scored pump list
    rugpull-risk/       Combined + scored risk list
    chat/                AI chat (Claude if key set, else rule-based fallback)
components/             UI panels (dumb, just render props)
lib/                    API clients, types, formatting, and the scoring engine
```

## Extending the scoring engine

All the actual "intelligence" lives in `lib/scoring.ts` — two plain
functions, `buildPumpCandidates` and `buildRugpullRisks`, that take arrays of
already-fetched data and return a scored, sorted, reasoned list. No black
box: every point added to a score has a comment explaining why. That's the
first place to look if you want to tune weights, add new signals (e.g. an
economic calendar feed, social mention counts, holder concentration via
Alchemy's `alchemy_getOwnersForToken`), or adjust thresholds.

## What's intentionally left as an MVP

- **Rugpull detection** doesn't yet check holder concentration or contract
  verification/honeypot status — those need extra on-chain calls per token
  and are good next additions using Alchemy's token/contract APIs.
- **Whale feed** watches a small starter list of major ERC-20 contracts on
  Ethereum mainnet — extend `lib/alchemy.ts`'s `WATCHLIST`, or add another
  Alchemy network URL, to cover more chains/tokens.
- **Economic calendar** wasn't in the home-page widget list you specified,
  so it's not wired up yet — happy to add a widget for it if useful.
