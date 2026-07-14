import { getDashboardSnapshot } from "@/lib/dashboardSnapshot";
import { computeTopDecliners, computeVolumeAnomalies } from "@/lib/market-insights";
import { TopNav } from "@/components/layout/TopNav";
import { Sidebar } from "@/components/Sidebar";
import { Footer } from "@/components/Footer";
import { MobileHome } from "@/components/mobile/MobileHome";
import { MarketOverviewStrip } from "@/components/market/MarketOverviewStrip";
import { CryptoHeatmap } from "@/components/heatmap/CryptoHeatmap";
import { SignalCardPro } from "@/components/ai-signal-pro/SignalCardPro";
import { PaperTraderSummaryCard } from "@/components/paper-trader/PaperTraderSummaryCard";
import { TokenScannerTeaser } from "@/components/scanner/TokenScannerTeaser";
import { ElVoidChatPanel } from "@/components/right-rail/ElVoidChatPanel";
import { AISummaryCard } from "@/components/right-rail/AISummaryCard";
import { MacroAlertCard } from "@/components/right-rail/MacroAlertCard";
import { WhaleAlertCard } from "@/components/right-rail/WhaleAlertCard";
import { EconomicCalendarMini } from "@/components/right-rail/EconomicCalendarMini";
import { BreakingNewsMini } from "@/components/right-rail/BreakingNewsMini";
import { SectionHeader } from "@/components/SectionHeader";
import Link from "next/link";
import { ArrowRight, Radar } from "lucide-react";

export const revalidate = 60;

export default async function Home() {
  const snap = await getDashboardSnapshot();
  const { base } = snap;
  const { markets, global, funding, whales, fng, news, calendar, pumpCandidates, rugpullRisks } = base;

  // Mobile-only derived reads — cheap pure functions, no extra fetch.
  const topDecliners = computeTopDecliners(markets, 5);
  const volumeAnomalies = computeVolumeAnomalies(rugpullRisks, 5);

  const topSignal = [...snap.openSignals].sort((a, b) => b.confidence - a.confidence)[0];

  return (
    <main className="min-h-screen">
      {/* Mobile Home — below lg breakpoint */}
      <div className="lg:hidden">
        <MobileHome
          tagline={snap.tagline}
          fng={fng}
          btcDominance={global?.market_cap_percentage.btc}
          altseason={snap.altseason}
          totalMcUsd={global?.total_market_cap.usd}
          mcChange24h={global?.market_cap_change_percentage_24h_usd}
          macro={snap.macro}
          whaleSummary={snap.whaleSummary}
          whales={whales}
          pumpCandidates={pumpCandidates}
          topDecliners={topDecliners}
          rugpullRisks={rugpullRisks}
          volumeAnomalies={volumeAnomalies}
          news={news}
          calendar={calendar}
          paperWallet={snap.paperWallet}
          paperStats={snap.paperStats}
          newSignalCount={snap.openSignals.length}
        />
      </div>

      {/* Desktop terminal layout — lg and up */}
      <div className="hidden lg:block lg:pt-14">
        <TopNav />
        <Sidebar />

        <div className="lg:pl-60">
          <div className="mx-auto max-w-[1680px] space-y-5 px-5 py-5">
            <div className="rounded-lg border border-amber/30 bg-amber/5 px-4 py-3 text-xs text-amber">
              ElVoid AI menyajikan sinyal berbasis data pasar publik secara rule-based dan transparan — bukan model
              black-box, bukan prediksi harga. Ini bukan nasihat keuangan; selalu lakukan riset mandiri sebelum
              mengambil keputusan trading.
            </div>

            <MarketOverviewStrip
              fng={fng ? { value: fng.now.value, classification: fng.now.classification } : undefined}
              btcDominance={global?.market_cap_percentage.btc}
              altseason={snap.altseason}
              totalMarketCapUsd={global?.total_market_cap.usd}
              marketCapChange24h={global?.market_cap_change_percentage_24h_usd}
              macro={snap.macro}
              stablecoin={snap.stablecoin}
              dxy={snap.dxy}
              m2={snap.m2}
            />

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]">
              {/* Center column */}
              <div className="min-w-0 space-y-5">
                <CryptoHeatmap markets={markets} rugpullRisks={rugpullRisks} smartMoneyAccumulation={snap.smartMoneyAccumulation} />

                <div>
                  <SectionHeader code="SIG" title="AI Signal" hint={`${snap.openSignals.length} sinyal aktif`} />
                  {topSignal ? (
                    <SignalCardPro signal={topSignal} />
                  ) : (
                    <div className="glow-card flex flex-col items-center justify-center gap-3 p-8 text-center">
                      <Radar size={22} className="text-ink-faint" />
                      <p className="text-sm text-ink-muted">Belum ada sinyal aktif. Jalankan scan untuk menghasilkan sinyal baru.</p>
                      <Link href="/ai-signal" className="rounded-md bg-signal px-4 py-2 text-xs font-medium text-white hover:bg-signal-glow">
                        Buka AI Signal
                      </Link>
                    </div>
                  )}
                  {snap.openSignals.length > 1 && (
                    <Link
                      href="/ai-signal"
                      className="mt-2 flex items-center justify-center gap-1.5 rounded-md border border-line py-2 text-xs text-ink-muted hover:border-signal/40 hover:text-ink"
                    >
                      Lihat semua {snap.openSignals.length} sinyal <ArrowRight size={12} />
                    </Link>
                  )}
                </div>

                <PaperTraderSummaryCard wallet={snap.paperWallet} stats={snap.paperStats} equityCurve={snap.equityCurve} recentTrades={snap.recentTrades} />

                <TokenScannerTeaser
                  data={{
                    pump: pumpCandidates,
                    dump: snap.dumpCandidates,
                    rugpull: rugpullRisks,
                    smartMoney: snap.smartMoneyAccumulation,
                    momentum: snap.highMomentum,
                    whaleBuying: snap.whaleBuying,
                    whaleSelling: snap.whaleSelling,
                  }}
                />
              </div>

              {/* Right rail */}
              <div className="space-y-5">
                <ElVoidChatPanel context={{ newsCount: news.length, fundingCount: funding.length }} />
                <AISummaryCard summary={snap.aiSummary} />
                <MacroAlertCard macro={snap.macro} />
                <WhaleAlertCard summary={snap.whaleSummary} transfers={whales} />
                <EconomicCalendarMini events={calendar} />
                <BreakingNewsMini news={news} />
              </div>
            </div>
          </div>

          <Footer />
        </div>
      </div>
    </main>
  );
}
