import Link from "next/link";
import {
  ArrowLeft,
  Waves,
  BarChart3,
  Zap,
  Newspaper,
  TrendingUp,
  Percent,
  Gauge,
  ArrowUpRight,
  Activity,
  Crosshair,
  Droplets,
  GitBranch,
  ShieldAlert,
  Brain,
} from "lucide-react";
import { Footer } from "@/components/Footer";

const ELVOID_SCANS = [
  { icon: ArrowUpRight, name: "Support & Resistance", desc: "Klaster swing high/low historis — makin sering disentuh, makin kuat levelnya." },
  { icon: Activity, name: "Price Action", desc: "Pola candle seperti engulfing, pin bar, dan inside bar dari beberapa candle terakhir." },
  { icon: Crosshair, name: "Liquidity Sweep", desc: "Wick yang menembus swing high/low lalu close kembali — indikasi stop-hunt/liquidity grab." },
  { icon: Droplets, name: "Liquidity Pool", desc: "Kumpulan equal-high/equal-low tempat stop loss cenderung menumpuk." },
  { icon: TrendingUp, name: "Trend Detection", desc: "Kesejajaran EMA 20/50/100 dikonfirmasi oleh struktur higher-high/higher-low." },
  { icon: BarChart3, name: "Volume Analysis", desc: "Volume candle terakhir dibanding rata-rata 20 candle, plus arah closing-nya." },
  { icon: Waves, name: "Whale Activity", desc: "Transfer on-chain besar untuk coin yang sama, dari feed whale Nocturn." },
  { icon: Newspaper, name: "News Sentiment", desc: "Berita terbaru yang menyebut coin tersebut, ditag positif/negatif/netral." },
  { icon: GitBranch, name: "Market Structure", desc: "Break of Structure dan Change of Character dari urutan swing point terbaru." },
  { icon: ShieldAlert, name: "Risk Assessment", desc: "Volatilitas (ATR), rasio R:R, jarak ke event makro high-impact, dan funding rate." },
];

const SIGNALS = [
  {
    icon: Waves,
    name: "Whale Activity",
    desc: "Large on-chain transfers that suggest informed capital moving in or out of a position.",
  },
  {
    icon: BarChart3,
    name: "Volume",
    desc: "Trading volume relative to market cap — a proxy for fresh attention versus a quiet holding pattern.",
  },
  {
    icon: Zap,
    name: "Momentum",
    desc: "Price acceleration across multiple timeframes, not just the size of a single move.",
  },
  {
    icon: Newspaper,
    name: "News",
    desc: "Recent coverage sentiment and frequency from tracked financial news sources.",
  },
  {
    icon: TrendingUp,
    name: "Open Interest",
    desc: "Outstanding derivatives positioning — how much leveraged exposure is currently on the table.",
  },
  {
    icon: Percent,
    name: "Funding",
    desc: "Perpetual futures funding rates — a read on whether longs or shorts are paying a premium.",
  },
  {
    icon: Gauge,
    name: "Market Sentiment",
    desc: "Broader market mood via the Fear & Greed Index and related market-wide indicators.",
  },
];

export const metadata = {
  title: "Methodology | Nocturn",
};

export default function MethodologyPage() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-line px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm text-ink-muted hover:text-ink">
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
          <span className="eyebrow text-[10px] tracking-[0.18em] text-ink-faint">Elstand Intelligence</span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="eyebrow text-[11px] text-signal-glow">METHODOLOGY</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">How Nocturn&rsquo;s AI Score Works</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          Nocturn distills seven categories of public, real-time market data into two composite reads on every asset
          it watches: an <strong className="font-medium text-ink">AI Score</strong> (momentum and opportunity) and a{" "}
          <strong className="font-medium text-ink">Risk Assessment</strong> score. Every score ships with a{" "}
          <strong className="font-medium text-ink">Confidence</strong> rating, so you can see how much independent
          evidence backs a read — not just how strong that read is.
        </p>

        <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-ink">Signal Inputs</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {SIGNALS.map((s) => (
            <div key={s.name} className="panel p-4">
              <div className="flex items-center gap-2">
                <s.icon size={16} className="text-signal-glow" />
                <span className="text-sm font-medium">{s.name}</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{s.desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-ink-faint">
          The exact weighting between categories is deliberately not published — publishing it would let bad actors
          reverse-engineer and game the score. What&rsquo;s published instead is what goes in, and how confident the
          output is.
        </p>

        <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-ink">How Confidence Is Calculated</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          Confidence reflects how many of the seven input categories independently corroborate a read — not how
          extreme any single signal is. An asset with strong momentum but no whale or derivatives confirmation
          carries a lower confidence than one where several categories agree. Confidence is deliberately capped short
          of certainty: no combination of public signals is proof, and Nocturn never reports 100%.
        </p>

        <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-ink">What These Scores Are Not</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-muted">
          <li>— Not a prediction. Scores describe current conditions, not future prices.</li>
          <li>
            — Not an audit. Risk Assessment reads public liquidity and trading patterns; it does not review smart
            contract code.
          </li>
          <li>— Not financial advice. Every score is a starting point for your own research, not a recommendation.</li>
          <li>— Not static. Markets move fast — scores are recalculated on every refresh and can shift within minutes.</li>
        </ul>

        <h2 className="mt-10 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink">
          <Brain size={15} className="text-signal-glow" /> ElVoid AI Paper Trader
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          ElVoid AI is Nocturn&rsquo;s signal-generation engine for <strong className="font-medium text-ink">paper
          trading only</strong> — a simulation with virtual balance, never connected to a real exchange and never
          touching real funds. Every scan below runs on live candle, whale, and news data, and every output is framed
          as <strong className="font-medium text-ink">Probability</strong>, <strong className="font-medium text-ink">Confidence</strong>,
          and <strong className="font-medium text-ink">Risk</strong> — not a promise of where price is headed.
        </p>

        <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-ink-faint">10 Scan Categories</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {ELVOID_SCANS.map((s) => (
            <div key={s.name} className="panel p-4">
              <div className="flex items-center gap-2">
                <s.icon size={16} className="text-signal-glow" />
                <span className="text-sm font-medium">{s.name}</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{s.desc}</p>
            </div>
          ))}
        </div>

        <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-ink-faint">From Scan to Signal</h3>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          The first 9 categories each vote bullish, bearish, or neutral with a weight attached — ElVoid AI takes the
          side with more weighted evidence as <strong className="font-medium text-ink">LONG</strong> or{" "}
          <strong className="font-medium text-ink">SHORT</strong>. Entry is the live price; Stop Loss sits just
          beyond the nearest protective support/resistance level (plus a small ATR buffer); Take Profit 1 and Take
          Profit 2 target the nearest opposing liquidity levels, falling back to fixed reward:risk multiples when no
          clear level exists. Risk Assessment — the 10th category — doesn&rsquo;t vote on direction; it evaluates
          volatility, R:R quality, upcoming high-impact macro events, and funding-rate crowding, then trims Confidence
          down when the setup is objectively riskier.
        </p>

        <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-ink-faint">Paper Trading Mechanics</h3>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-muted">
          <li>
            — Every trade risks a fixed <strong className="font-medium text-ink">% of equity</strong> (default 1%,
            adjustable in Settings) — a full Stop Loss is always exactly that percentage, never more.
          </li>
          <li>
            — When price reaches TP1, the stop moves to breakeven and the position keeps running toward TP2, instead
            of closing the whole position at the first target.
          </li>
          <li>
            — Win Rate, Profit Factor, Average RR, and Max Drawdown are recalculated from actual closed paper trades
            in <code className="rounded bg-bg-raised px-1 py-0.5 text-xs">ai_journal</code> — nothing is simulated or
            estimated after the fact.
          </li>
          <li>
            — For strategies with at least 5 closed trades, their historical win rate nudges future Confidence for
            that same strategy label — capped at ±8 points, so history informs the score without ever dominating it.
          </li>
        </ul>

        <p className="mt-4 text-xs leading-relaxed text-ink-faint">
          <Link href="/paper-trader" className="text-signal-glow hover:underline">
            Try ElVoid AI Paper Trader →
          </Link>
        </p>

        <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-ink">Data Sources</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          Nocturn draws exclusively from public market data: exchange price and volume feeds, OHLCV candle history
          from Binance, on-chain liquidity and transfer data, derivatives exchange funding and open interest, and
          aggregated financial news. Nocturn does not use private, insider, or non-public information of any kind.
        </p>

        <div className="mt-10 rounded-lg border border-amber/30 bg-amber/5 px-4 py-3 text-xs leading-relaxed text-amber">
          Nothing on this page or anywhere in Nocturn constitutes financial advice. Digital assets are volatile and
          high-risk — always do your own research and verify independently before making any financial decision.
        </div>
      </div>

      <Footer />
    </main>
  );
}
