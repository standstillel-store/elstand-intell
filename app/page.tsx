import { getSnapshot } from "@/lib/snapshot";
import { TopBar } from "@/components/TopBar";
import { PulseTicker } from "@/components/PulseTicker";
import { PumpCandidatesPanel } from "@/components/PumpCandidatesPanel";
import { RugpullRiskPanel } from "@/components/RugpullRiskPanel";
import { SmartMoneyPanel } from "@/components/SmartMoneyPanel";
import { FearGreedGauge } from "@/components/FearGreedGauge";
import { EconomicCalendarPanel } from "@/components/EconomicCalendarPanel";
import { AIChatDock } from "@/components/AIChatDock";
import { Footer } from "@/components/Footer";
import { MobileHome } from "@/components/mobile/MobileHome";
import { formatUsd } from "@/lib/format";
import {
  computeAltseasonIndex,
  computeMacroStatus,
  computeVolumeAnomalies,
  computeSystemTagline,
  computeTopDecliners,
  computeWhaleSummary,
} from "@/lib/market-insights";

export const revalidate = 60;

export default async function Home() {
  const { markets, global, funding, whales, fng, news, calendar, pumpCandidates, rugpullRisks } =
    await getSnapshot();

  const tickerItems = [
    ...pumpCandidates.slice(0, 5).map((c) => `${c.symbol} MOMENTUM ${c.score}`),
    ...rugpullRisks.slice(0, 5).map((r) => `${r.symbol} RISK-SCORE ${r.score}`),
    fng ? `FEAR&GREED ${fng.now.value} (${fng.now.classification})` : "",
  ].filter(Boolean);

  // Derived read-outs for the mobile Home dashboard — pure functions over
  // the same snapshot above, no extra fetches. See lib/market-insights.ts.
  const altseason = computeAltseasonIndex(markets);
  const macro = computeMacroStatus(calendar);
  const topDecliners = computeTopDecliners(markets, 5);
  const volumeAnomalies = computeVolumeAnomalies(rugpullRisks, 5);
  const whaleSummary = computeWhaleSummary(whales);
  const tagline = computeSystemTagline(fng?.now.value, rugpullRisks.length, pumpCandidates.length);

  return (
    <main className="min-h-screen">
      {/* Mobile Home — below lg breakpoint */}
      <div className="lg:hidden">
        <MobileHome
          tagline={tagline}
          fng={fng}
          btcDominance={global?.market_cap_percentage.btc}
          altseason={altseason}
          totalMcUsd={global?.total_market_cap.usd}
          mcChange24h={global?.market_cap_change_percentage_24h_usd}
          macro={macro}
          whaleSummary={whaleSummary}
          whales={whales}
          pumpCandidates={pumpCandidates}
          topDecliners={topDecliners}
          rugpullRisks={rugpullRisks}
          volumeAnomalies={volumeAnomalies}
          news={news}
          calendar={calendar}
        />
      </div>

      {/* Desktop terminal layout — lg and up */}
      <div className="hidden pb-20 lg:block">
        <TopBar
          btcPrice={markets.find((m) => m.symbol === "btc")?.current_price}
          mcap={global?.total_market_cap?.usd}
          fng={fng?.now.value}
        />
        <PulseTicker items={tickerItems} />

        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="mb-6 rounded-lg border border-amber/30 bg-amber/5 px-4 py-3 text-xs text-amber">
            Nocturn surfaces data-driven signals from public market data. It cannot predict future prices. Nothing
            here is financial advice — always verify independently before trading.
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="space-y-5 lg:col-span-2">
              <PumpCandidatesPanel items={pumpCandidates} />
              <RugpullRiskPanel items={rugpullRisks} />
            </div>
            <div className="space-y-5">
              <FearGreedGauge
                value={fng?.now.value ?? 50}
                classification={fng?.now.classification ?? "Unknown"}
                prevValue={fng?.yesterday?.value}
              />
              <SmartMoneyPanel items={whales} />
              <EconomicCalendarPanel items={calendar} />
            </div>
          </div>

          {global && (
            <p className="mono-num mt-6 text-center text-xs text-ink-faint">
              Total market cap {formatUsd(global.total_market_cap.usd)} · BTC dominance{" "}
              {global.market_cap_percentage.btc.toFixed(1)}%
            </p>
          )}
        </div>

        <Footer />
        <AIChatDock context={{ newsCount: news.length, fundingCount: funding.length }} />
      </div>
    </main>
  );
}
