import { NavDrawer } from "./NavDrawer";
import { AskNocturnBar } from "./AskNocturnBar";
import { MarketHealthSection } from "./MarketHealthSection";
import { SmartMoneySection } from "./SmartMoneySection";
import { AiSignalSection } from "./AiSignalSection";
import { MarketIntelSection } from "./MarketIntelSection";
import { TokenAnalyzerSection } from "./TokenAnalyzerSection";
import type { AltseasonReading, MacroReading, WhaleSummary } from "@/lib/market-insights";
import type {
  CoinMarket,
  EconomicEvent,
  FearGreedPoint,
  NewsItem,
  PumpCandidate,
  RugpullRisk,
  WhaleTransfer,
} from "@/lib/types";

export function MobileHome({
  tagline,
  fng,
  btcDominance,
  altseason,
  totalMcUsd,
  mcChange24h,
  macro,
  whaleSummary,
  whales,
  pumpCandidates,
  topDecliners,
  rugpullRisks,
  manipulationAlerts,
  news,
  calendar,
}: {
  tagline: string;
  fng?: { now: FearGreedPoint; yesterday?: FearGreedPoint };
  btcDominance?: number;
  altseason?: AltseasonReading;
  totalMcUsd?: number;
  mcChange24h?: number;
  macro: MacroReading;
  whaleSummary: WhaleSummary;
  whales: WhaleTransfer[];
  pumpCandidates: PumpCandidate[];
  topDecliners: CoinMarket[];
  rugpullRisks: RugpullRisk[];
  manipulationAlerts: RugpullRisk[];
  news: NewsItem[];
  calendar: EconomicEvent[];
}) {
  return (
    <div className="pb-4">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          <NavDrawer />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-signal animate-pulseGlow" />
              <span className="text-base font-bold tracking-tight">NOCTURN AI</span>
            </div>
            <p className="eyebrow truncate text-[11px] text-ink-muted">&ldquo;{tagline}&rdquo;</p>
          </div>
        </div>
        <AskNocturnBar />
      </header>

      <div className="space-y-3 px-4 pt-3">
        <MarketHealthSection
          fng={fng}
          btcDominance={btcDominance}
          altseason={altseason}
          totalMcUsd={totalMcUsd}
          mcChange24h={mcChange24h}
          macro={macro}
        />
        <SmartMoneySection whaleSummary={whaleSummary} whales={whales} />
        <AiSignalSection
          pumpCandidates={pumpCandidates}
          topDecliners={topDecliners}
          rugpullRisks={rugpullRisks}
          manipulationAlerts={manipulationAlerts}
        />
        <MarketIntelSection news={news} calendar={calendar} />
        <TokenAnalyzerSection />

        <p className="rounded-lg border border-amber/30 bg-amber/5 px-3.5 py-3 text-[11px] leading-relaxed text-amber">
          Nocturn menyajikan sinyal berbasis data publik. Bukan nasihat keuangan — semua skor adalah bahan
          pertimbangan, bukan jaminan. Selalu verifikasi mandiri sebelum bertransaksi.
        </p>
      </div>
    </div>
  );
}
