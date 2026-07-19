import Link from "next/link";
import type { Metadata } from "next";
import { Radar, Wallet, ScanSearch, Waves, Newspaper } from "lucide-react";
import { getDashboardSnapshot } from "@/lib/dashboardSnapshot";
import { isRelevantAsset } from "@/lib/asset-filters";
import { TopNav } from "@/components/layout/TopNav";
import { Sidebar } from "@/components/Sidebar";
import { Footer } from "@/components/Footer";
import { NavDrawer } from "@/components/mobile/NavDrawer";
import { AIChatDock } from "@/components/AIChatDock";
import { AISummaryCard } from "@/components/right-rail/AISummaryCard";
import { TopMarketOverview } from "@/components/intelligence/TopMarketOverview";
import { GlobalIntelligenceMap } from "@/components/intelligence/GlobalIntelligenceMap";
import { WhaleLiquidityPanel } from "@/components/intelligence/WhaleLiquidityPanel";
import { InstitutionalFlowPanel } from "@/components/intelligence/InstitutionalFlowPanel";
import { SectorRotationHeatmap } from "@/components/intelligence/SectorRotationHeatmap";
import { AltcoinScannerTable } from "@/components/intelligence/AltcoinScannerTable";
import { computeSectorRotation, getSampleSectorRotation } from "@/lib/intelligence/sectorRotation";
import { buildAltcoinScannerRows, getSampleAltcoinScannerRows } from "@/lib/intelligence/altcoinScanner";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "ElStand AI Market Intelligence: peta hubungan antar market, whale & liquidity, institutional flow, sector rotation, dan AI summary dalam satu dashboard.",
  robots: { index: false, follow: false },
};

export const revalidate = 60;

const QUICK_LINKS = [
  { href: "/ai-signal", label: "AI Signal", icon: Radar },
  { href: "/paper-trader", label: "Paper Trader", icon: Wallet },
  { href: "/scanner", label: "Token Scanner", icon: ScanSearch },
  { href: "/whale", label: "Whale Activity", icon: Waves },
  { href: "/news", label: "News", icon: Newspaper },
];

export default async function Home() {
  const snap = await getDashboardSnapshot();
  const { base } = snap;
  const { markets, global, funding, whales, fng, news } = base;

  const btcMarket = markets.find((m) => m.symbol.toLowerCase() === "btc");
  const ethMarket = markets.find((m) => m.symbol.toLowerCase() === "eth");

  const altMarkets = markets
    .filter((m) => isRelevantAsset(m))
    .filter((m) => m.symbol.toLowerCase() !== "btc" && m.symbol.toLowerCase() !== "eth")
    .slice(0, 30);
  const altChange24h = altMarkets.length
    ? altMarkets.reduce((s, m) => s + (m.price_change_percentage_24h_in_currency ?? 0), 0) / altMarkets.length
    : undefined;
  const altcoinMarketCapUsd =
    global?.total_market_cap.usd !== undefined
      ? Math.max(0, global.total_market_cap.usd - (btcMarket?.market_cap ?? 0) - (ethMarket?.market_cap ?? 0))
      : undefined;

  const sectorRotation = markets.length ? computeSectorRotation(markets) : getSampleSectorRotation();
  const topSector = [...sectorRotation].sort((a, b) => b.momentum - a.momentum)[0];
  const scannerRows = markets.length ? buildAltcoinScannerRows(markets, snap.smartMoneyAccumulation) : getSampleAltcoinScannerRows();

  return (
    <main className="min-h-screen lg:pt-14">
      <TopNav />
      <Sidebar />

      {/* Mobile header — desktop uses TopNav + Sidebar above instead */}
      <div className="sticky top-0 z-20 flex items-center gap-2.5 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur lg:hidden">
        <NavDrawer />
        <span className="h-2 w-2 rounded-full bg-signal animate-pulseGlow" />
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-bold tracking-tight">ELSTAND</span>
          <span className="text-[10px] font-semibold tracking-wide text-ink-faint">INTEL</span>
        </div>
      </div>

      <div className="lg:pl-60">
        <div className="mx-auto max-w-[1680px] space-y-5 px-4 py-5 lg:px-5">
          <div className="rounded-lg border border-amber/30 bg-amber/5 px-4 py-3 text-xs leading-relaxed text-amber">
            ElStand AI menyajikan analisis hubungan antar market berbasis data publik secara rule-based dan transparan —
            bukan model black-box, bukan sinyal beli/jual, dan bukan jaminan keuntungan. Selalu lakukan riset mandiri
            sebelum mengambil keputusan.
          </div>

          <TopMarketOverview
            btc={
              btcMarket
                ? {
                    price: btcMarket.current_price,
                    change24h: btcMarket.price_change_percentage_24h_in_currency,
                    change7d: btcMarket.price_change_percentage_7d_in_currency,
                  }
                : undefined
            }
            eth={
              ethMarket
                ? {
                    price: ethMarket.current_price,
                    change24h: ethMarket.price_change_percentage_24h_in_currency,
                    change7d: ethMarket.price_change_percentage_7d_in_currency,
                  }
                : undefined
            }
            totalMarketCapUsd={global?.total_market_cap.usd}
            marketCapChange24h={global?.market_cap_change_percentage_24h_usd}
            btcDominance={global?.market_cap_percentage.btc}
            fng={fng ? { value: fng.now.value, classification: fng.now.classification } : undefined}
            dxyChangePct={snap.dxy?.changePct}
          />

          <GlobalIntelligenceMap
            live={{
              totalMarketCapUsd: global?.total_market_cap.usd,
              totalMarketCapChange24h: global?.market_cap_change_percentage_24h_usd,
              btcPrice: btcMarket?.current_price,
              btcChange24h: btcMarket?.price_change_percentage_24h_in_currency,
              btcChange7d: btcMarket?.price_change_percentage_7d_in_currency,
              btcDominance: global?.market_cap_percentage.btc,
              ethPrice: ethMarket?.current_price,
              ethChange24h: ethMarket?.price_change_percentage_24h_in_currency,
              ethChange7d: ethMarket?.price_change_percentage_7d_in_currency,
              altcoinChange24h: altChange24h,
              altcoinMarketCapUsd,
              topSectorLabel: topSector ? `${topSector.sector} · ${topSector.trendLabel}` : undefined,
              dxyValue: snap.dxy?.value,
              dxyChangePct: snap.dxy?.changePct,
            }}
          />

          <WhaleLiquidityPanel transfers={whales} whaleSummary={snap.whaleSummary} funding={funding} liquiditySymbol="BTCUSDT" />

          <InstitutionalFlowPanel smartMoney={snap.smartMoneyAccumulation} />

          <SectorRotationHeatmap rows={sectorRotation} />

          <AISummaryCard summary={snap.aiSummary} />

          <AltcoinScannerTable rows={scannerRows} />

          <div>
            <p className="mb-2 text-[11px] uppercase tracking-wide text-ink-faint">Lainnya dari ElStand AI</p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
              {QUICK_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="glow-card flex items-center gap-2 px-3 py-2.5 text-xs text-ink-muted hover:text-ink"
                >
                  <item.icon size={14} className="shrink-0 text-signal-glow" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <Footer />
      </div>

      <AIChatDock context={{ newsCount: news.length, fundingCount: funding.length }} />
    </main>
  );
}
