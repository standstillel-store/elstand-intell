import { NextResponse } from "next/server";
import { getDashboardSnapshot } from "@/lib/dashboardSnapshot";
import { routeTerminalMessage } from "@/lib/analysis";
import { deriveGlobalSentiment } from "@/lib/intelligence/globalSentiment";
import { deriveMarketPulse, type MarketPulseInputs } from "@/lib/intelligence/marketPulse";
import { deriveFinalConclusion } from "@/lib/intelligence/finalConclusion";
import { buildMarketSnapshotReport } from "@/lib/intelligence/marketSnapshotReport";
import { getInstitutionalFlowData } from "@/lib/intelligence/institutionalFlow";
import { getUsdReading } from "@/lib/intelligence/sources/usd";
import { getGoldReading } from "@/lib/intelligence/sources/gold";
import { getStocksReading } from "@/lib/intelligence/sources/stocks";
import { getNextHighImpactEvent } from "@/lib/intelligence/macroEvents";
import { isRelevantAsset } from "@/lib/asset-filters";
import { chargeEnergy } from "@/lib/energyGate";
import type { TerminalReport } from "@/lib/terminalReport";

interface ChatBody {
  message: string;
}

function errorReport(message: string, eyebrow = "ERR"): TerminalReport {
  return { eyebrow, title: "SYSTEM", found: false, emptyNote: message, rows: [] };
}

// ELSTAND INTELLIGENCE's chat dock (ElVoid AI) used to proxy every question to the
// OpenAI API, which costs real money per request. It now runs entirely on
// ElVoid AI's own rule-based Intelligence Engine (lib/analysis.ts): live data
// in, a structured TerminalReport out — no LLM call, no API key, no cost,
// ever. See lib/terminalReport.ts for the response shape (V3 "institutional
// terminal" format — no more markdown/emoji strings).
export async function POST(req: Request) {
  let body: ChatBody;
  try {
    body = (await req.json()) as ChatBody;
  } catch {
    return NextResponse.json({ report: errorReport("Pesan tidak valid.") }, { status: 400 });
  }

  const message = (body.message ?? "").toString().slice(0, 500);
  if (!message.trim()) {
    return NextResponse.json({
      report: errorReport('Tanya sesuatu dulu — misalnya "analisa BTC" atau "whale activity".', "AI"),
    });
  }

  const blocked = await chargeEnergy(1, "chat");
  if (blocked) return blocked;

  try {
    const snap = await getDashboardSnapshot();
    const { base } = snap;

    let report = routeTerminalMessage(message, base);

    if (!report) {
      report = await buildGeneralMarketReport(snap);
    }

    return NextResponse.json({ report });
  } catch (err) {
    console.error("[ElVoid AI] chat engine error:", err);
    return NextResponse.json({
      report: errorReport("Data live sedang tidak bisa diambil sebentar — coba lagi dalam beberapa detik."),
    });
  }
}

/**
 * Builds the "ringkasan market" reply. Mirrors the sentiment/pulse/final-
 * conclusion assembly in app/dashboard/page.tsx (same input fields, same
 * derive*() calls) so this chat reply can never disagree with the Map,
 * Market Pulse gauges, or Final Conclusion card shown on the dashboard
 * itself. Keep the two in sync if either one changes.
 */
async function buildGeneralMarketReport(snap: Awaited<ReturnType<typeof getDashboardSnapshot>>): Promise<TerminalReport> {
  const { base } = snap;
  const { markets, global, funding, fng, calendar } = base;

  const btcMarket = markets.find((m) => m.symbol.toLowerCase() === "btc");
  const ethMarket = markets.find((m) => m.symbol.toLowerCase() === "eth");
  const altMarkets = markets
    .filter((m) => isRelevantAsset(m))
    .filter((m) => m.symbol.toLowerCase() !== "btc" && m.symbol.toLowerCase() !== "eth");
  const altSample = altMarkets.slice(0, 30);
  const altChange24h = altSample.length
    ? altSample.reduce((s, m) => s + (m.price_change_percentage_24h_in_currency ?? 0), 0) / altSample.length
    : undefined;
  const rankedAlts = altMarkets.filter((m) => m.price_change_percentage_24h_in_currency !== undefined);
  const watchlist = [...rankedAlts]
    .sort((a, b) => (b.price_change_percentage_24h_in_currency ?? 0) - (a.price_change_percentage_24h_in_currency ?? 0))
    .slice(0, 3)
    .map((m) => ({ symbol: m.symbol.toUpperCase(), change24h: m.price_change_percentage_24h_in_currency ?? 0 }));

  const [usd, gold, stocks, institutionalFlow] = await Promise.all([
    getUsdReading(),
    getGoldReading(),
    getStocksReading(),
    getInstitutionalFlowData(),
  ]);
  const nextHighImpact = getNextHighImpactEvent(calendar);
  const stocksChangePct = stocks?.indices.length
    ? stocks.indices.reduce((s, i) => s + (i.changePct ?? 0), 0) / stocks.indices.length
    : undefined;

  const sentiment = deriveGlobalSentiment({
    fngValue: fng?.now.value,
    mcChange24h: global?.market_cap_change_percentage_24h_usd,
    dxyChangePct: usd?.changePct,
    goldChangePct: gold?.changePct,
    stocksChangePct,
    btcChange24h: btcMarket?.price_change_percentage_24h_in_currency,
    btcChange7d: btcMarket?.price_change_percentage_7d_in_currency,
    altcoinChange24h: altChange24h,
    imminentHighImpactEvent: nextHighImpact,
  });

  const btcFunding = funding.find((f) => f.symbol.toUpperCase() === "BTCUSDT");
  const pulseInputs: MarketPulseInputs = {
    sentiment,
    macro: snap.macro,
    whaleSummary: snap.whaleSummary,
    fngValue: fng?.now.value,
    fngClassification: fng?.now.classification,
    stablecoinChange24hUsd: snap.stablecoin?.change24hUsd,
    btcFundingRate: btcFunding?.lastFundingRate,
    altseason: snap.altseason,
    etfNetTotalUsd: institutionalFlow.connected ? institutionalFlow.etfNetTotalUsd : undefined,
  };
  const pulse = deriveMarketPulse(pulseInputs);
  const finalConclusion = deriveFinalConclusion({
    sentiment,
    btcChange24h: btcMarket?.price_change_percentage_24h_in_currency,
    ethChange24h: ethMarket?.price_change_percentage_24h_in_currency,
    altChange24h,
    watchlist,
  });

  return buildMarketSnapshotReport({
    pulse,
    finalConclusion,
    totalMarketCapUsd: global?.total_market_cap.usd,
    marketCapChange24h: global?.market_cap_change_percentage_24h_usd,
    btcDominance: global?.market_cap_percentage.btc,
    fngValue: fng?.now.value,
    fngClassification: fng?.now.classification,
    btcFundingRate: btcFunding?.lastFundingRate,
    btcOpenInterestUsd: btcFunding?.openInterestValue,
  });
}
