import Link from "next/link";
import { ArrowLeft, Waves, BarChart3, Zap, Newspaper, TrendingUp, Percent, Gauge } from "lucide-react";
import { Footer } from "@/components/Footer";

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

        <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-ink">Data Sources</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          Nocturn draws exclusively from public market data: exchange price and volume feeds, on-chain liquidity and
          transfer data, derivatives exchange funding and open interest, and aggregated financial news. Nocturn does
          not use private, insider, or non-public information of any kind.
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
