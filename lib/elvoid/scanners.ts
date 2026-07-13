import type { Candle, ScanResult } from "./types";
import type { NewsItem, WhaleTransfer, EconomicEvent, FundingInfo } from "../types";
import type { SrLevel, TrendReading, SwingPoint } from "./indicators";

// ---------------------------------------------------------------------------
// ElVoid AI's 10 required scan categories. Each function is a small, pure,
// explainable rule — no black box, same spirit as lib/scoring.ts. Every
// scanner returns a ScanResult: which way it leans (bullish/bearish/
// neutral), how much weight it contributes to that side, and a
// human-readable reason in Bahasa Indonesia. lib/elvoid/engine.ts sums
// these into a LONG/SHORT decision and a Confidence Score.
// ---------------------------------------------------------------------------

function res(key: string, label: string, bias: ScanResult["bias"], weight: number, detail: string): ScanResult {
  return { key, label, bias, weight: Math.max(0, weight), detail };
}

// 1) Support & Resistance -----------------------------------------------------
export function scanSupportResistance(currentPrice: number, srLevels: SrLevel[]): ScanResult {
  const nearby = srLevels
    .map((l) => ({ ...l, distPct: Math.abs(l.price - currentPrice) / currentPrice }))
    .filter((l) => l.distPct <= 0.01 && l.touches >= 2)
    .sort((a, b) => a.distPct - b.distPct);

  const nearest = nearby[0];
  if (!nearest) {
    return res(
      "support_resistance",
      "Support & Resistance",
      "neutral",
      0,
      "Harga sedang berada di antara level S/R — belum di area reaksi yang kuat."
    );
  }
  if (nearest.type === "support") {
    return res(
      "support_resistance",
      "Support & Resistance",
      "bullish",
      8 + nearest.touches * 3,
      `Harga menguji support yang sudah ${nearest.touches}x disentuh — peluang bounce di area ini.`
    );
  }
  return res(
    "support_resistance",
    "Support & Resistance",
    "bearish",
    8 + nearest.touches * 3,
    `Harga menguji resistance yang sudah ${nearest.touches}x disentuh — peluang rejection di area ini.`
  );
}

// 2) Price Action ---------------------------------------------------------------
export function scanPriceAction(candles: Candle[]): ScanResult {
  const n = candles.length;
  if (n < 3) return res("price_action", "Price Action", "neutral", 0, "Data candle belum cukup untuk membaca price action.");
  const c1 = candles[n - 2];
  const c0 = candles[n - 1];

  const body = (c: Candle) => Math.abs(c.close - c.open);
  const range = (c: Candle) => c.high - c.low || 1e-9;
  const upperWick = (c: Candle) => c.high - Math.max(c.open, c.close);
  const lowerWick = (c: Candle) => Math.min(c.open, c.close) - c.low;

  // Bullish engulfing: prior red candle fully engulfed by the current green candle
  if (c1.close < c1.open && c0.close > c0.open && c0.close >= c1.open && c0.open <= c1.close) {
    return res("price_action", "Price Action", "bullish", 12, "Bullish engulfing terbentuk — tekanan beli menelan candle sebelumnya.");
  }
  // Bearish engulfing
  if (c1.close > c1.open && c0.close < c0.open && c0.open >= c1.close && c0.close <= c1.open) {
    return res("price_action", "Price Action", "bearish", 12, "Bearish engulfing terbentuk — tekanan jual menelan candle sebelumnya.");
  }
  // Hammer / bullish pin bar: long lower wick, small body near the top of the range
  if (lowerWick(c0) >= body(c0) * 2 && lowerWick(c0) / range(c0) >= 0.5 && upperWick(c0) < body(c0)) {
    return res("price_action", "Price Action", "bullish", 9, "Hammer / pin bar bullish — penolakan tajam dari sisi bawah candle.");
  }
  // Shooting star / bearish pin bar
  if (upperWick(c0) >= body(c0) * 2 && upperWick(c0) / range(c0) >= 0.5 && lowerWick(c0) < body(c0)) {
    return res("price_action", "Price Action", "bearish", 9, "Shooting star / pin bar bearish — penolakan tajam dari sisi atas candle.");
  }
  // Inside bar — pure indecision
  if (c0.high <= c1.high && c0.low >= c1.low) {
    return res("price_action", "Price Action", "neutral", 0, "Inside bar — kompresi volatilitas, market menunggu konfirmasi arah.");
  }
  return res("price_action", "Price Action", "neutral", 0, "Tidak ada pola candle signifikan di beberapa bar terakhir.");
}

// 3) Liquidity Sweep --------------------------------------------------------------
export function scanLiquiditySweep(candles: Candle[], swings: SwingPoint[], lastAtr: number): ScanResult {
  const n = candles.length;
  if (n < 5) return res("liquidity_sweep", "Liquidity Sweep", "neutral", 0, "Data candle belum cukup untuk deteksi liquidity sweep.");
  const last = candles[n - 1];

  const priorLow = swings.filter((s) => s.type === "low" && s.index < n - 1).slice(-1)[0];
  const priorHigh = swings.filter((s) => s.type === "high" && s.index < n - 1).slice(-1)[0];

  // Wick sweeps below a prior swing low, then closes back above it — classic stop-hunt reversal
  if (priorLow && last.low < priorLow.price && last.close > priorLow.price) {
    const pierce = (priorLow.price - last.low) / (lastAtr || 1);
    return res(
      "liquidity_sweep",
      "Liquidity Sweep",
      "bullish",
      14 + Math.min(8, pierce * 6),
      "Wick menembus swing low sebelumnya lalu close kembali di atasnya — indikasi stop-hunt/liquidity grab, potensi reversal naik."
    );
  }
  // Wick sweeps above a prior swing high, then closes back below it
  if (priorHigh && last.high > priorHigh.price && last.close < priorHigh.price) {
    const pierce = (last.high - priorHigh.price) / (lastAtr || 1);
    return res(
      "liquidity_sweep",
      "Liquidity Sweep",
      "bearish",
      14 + Math.min(8, pierce * 6),
      "Wick menembus swing high sebelumnya lalu close kembali di bawahnya — indikasi stop-hunt/liquidity grab, potensi reversal turun."
    );
  }
  return res("liquidity_sweep", "Liquidity Sweep", "neutral", 0, "Belum ada sweep likuiditas yang jelas di candle terbaru.");
}

// 4) Liquidity Pool ------------------------------------------------------------------
export function scanLiquidityPool(currentPrice: number, swings: SwingPoint[]): ScanResult {
  const tolerance = 0.004;

  function findPools(points: SwingPoint[]) {
    const pools: { price: number; count: number }[] = [];
    for (const p of points) {
      const match = pools.find((pool) => Math.abs(pool.price - p.price) / p.price <= tolerance);
      if (match) match.count += 1;
      else pools.push({ price: p.price, count: 1 });
    }
    return pools.filter((p) => p.count >= 2);
  }

  const highPools = findPools(swings.filter((s) => s.type === "high")).sort(
    (a, b) => Math.abs(a.price - currentPrice) - Math.abs(b.price - currentPrice)
  );
  const lowPools = findPools(swings.filter((s) => s.type === "low")).sort(
    (a, b) => Math.abs(a.price - currentPrice) - Math.abs(b.price - currentPrice)
  );

  const nearestHighPool = highPools.find((p) => p.price > currentPrice);
  const nearestLowPool = lowPools.find((p) => p.price < currentPrice);

  if (!nearestHighPool && !nearestLowPool) {
    return res("liquidity_pool", "Liquidity Pool", "neutral", 0, "Belum terdeteksi kumpulan equal-high/equal-low yang signifikan.");
  }

  const distHigh = nearestHighPool ? (nearestHighPool.price - currentPrice) / currentPrice : Infinity;
  const distLow = nearestLowPool ? (currentPrice - nearestLowPool.price) / currentPrice : Infinity;

  // Price tends to be "drawn" toward the nearer untapped liquidity pool
  if (distHigh < distLow && nearestHighPool) {
    return res(
      "liquidity_pool",
      "Liquidity Pool",
      "bullish",
      6 + (nearestHighPool.count - 1) * 2,
      `Equal-high pool (${nearestHighPool.count}x) terdeteksi di atas harga — likuiditas belum tersapu, berpotensi jadi target harga.`
    );
  }
  if (nearestLowPool) {
    return res(
      "liquidity_pool",
      "Liquidity Pool",
      "bearish",
      6 + (nearestLowPool.count - 1) * 2,
      `Equal-low pool (${nearestLowPool.count}x) terdeteksi di bawah harga — likuiditas belum tersapu, berpotensi jadi target harga.`
    );
  }
  return res("liquidity_pool", "Liquidity Pool", "neutral", 0, "Belum terdeteksi kumpulan equal-high/equal-low yang signifikan.");
}

// 5) Trend Detection ---------------------------------------------------------------
export function scanTrend(trend: TrendReading): ScanResult {
  if (trend.direction === "uptrend") return res("trend", "Trend Detection", "bullish", trend.strength * 0.18, trend.detail);
  if (trend.direction === "downtrend") return res("trend", "Trend Detection", "bearish", trend.strength * 0.18, trend.detail);
  return res("trend", "Trend Detection", "neutral", 0, trend.detail);
}

// 6) Volume Analysis ------------------------------------------------------------------
export function scanVolume(candles: Candle[], ratio: number, spiking: boolean): ScanResult {
  const last = candles[candles.length - 1];
  if (!spiking) {
    return res("volume", "Volume Analysis", "neutral", 0, `Volume normal, ${ratio.toFixed(1)}x rata-rata 20 candle terakhir.`);
  }
  const bullishClose = last.close > last.open;
  if (bullishClose) {
    return res(
      "volume",
      "Volume Analysis",
      "bullish",
      8 + Math.min(10, (ratio - 1) * 5),
      `Volume spike ${ratio.toFixed(1)}x rata-rata dengan candle bullish — konfirmasi minat beli.`
    );
  }
  return res(
    "volume",
    "Volume Analysis",
    "bearish",
    8 + Math.min(10, (ratio - 1) * 5),
    `Volume spike ${ratio.toFixed(1)}x rata-rata dengan candle bearish — konfirmasi tekanan jual.`
  );
}

// 7) Whale Activity ---------------------------------------------------------------------
export function scanWhaleActivity(whales: WhaleTransfer[], symbol: string): ScanResult {
  const matches = whales.filter((w) => w.asset.toLowerCase() === symbol.toLowerCase());
  const total = matches.reduce((s, w) => s + w.valueUsd, 0);
  if (!matches.length) {
    return res("whale_activity", "Whale Activity", "neutral", 0, "Tidak ada transfer whale besar yang terdeteksi untuk coin ini.");
  }
  const weight = total > 1_000_000 ? 10 : total > 250_000 ? 6 : 3;
  return res(
    "whale_activity",
    "Whale Activity",
    "bullish",
    weight,
    `${matches.length} transfer besar terdeteksi, total sekitar $${(total / 1e6).toFixed(2)}M — aktivitas whale sering mendahului volatilitas.`
  );
}

// 8) News Sentiment -------------------------------------------------------------------------
export function scanNewsSentiment(news: NewsItem[], symbol: string, name: string): ScanResult {
  const s = symbol.toLowerCase();
  const n = name.toLowerCase();
  const matches = news.filter((item) => {
    const t = item.title.toLowerCase();
    return t.includes(s) || (n.length > 2 && t.includes(n));
  });
  if (!matches.length) {
    return res("news_sentiment", "News Sentiment", "neutral", 0, "Tidak ada berita spesifik yang menyebut coin ini baru-baru ini.");
  }
  const pos = matches.filter((m) => m.sentiment === "positive").length;
  const neg = matches.filter((m) => m.sentiment === "negative").length;
  if (pos === neg) {
    return res("news_sentiment", "News Sentiment", "neutral", 0, `${matches.length} berita ditemukan, sentimen campuran/netral.`);
  }
  if (pos > neg) {
    return res("news_sentiment", "News Sentiment", "bullish", 5 + (pos - neg) * 2, `${pos} dari ${matches.length} berita terbaru bersentimen positif.`);
  }
  return res("news_sentiment", "News Sentiment", "bearish", 5 + (neg - pos) * 2, `${neg} dari ${matches.length} berita terbaru bersentimen negatif.`);
}

// 9) Market Structure --------------------------------------------------------------------------
export function scanMarketStructure(swings: SwingPoint[]): ScanResult {
  const highs = swings.filter((s) => s.type === "high").slice(-3);
  const lows = swings.filter((s) => s.type === "low").slice(-3);
  if (highs.length < 2 || lows.length < 2) {
    return res("market_structure", "Market Structure", "neutral", 0, "Belum cukup swing point untuk membaca struktur pasar.");
  }
  const higherHighs = highs[highs.length - 1].price > highs[0].price;
  const higherLows = lows[lows.length - 1].price > lows[0].price;
  const lowerHighs = highs[highs.length - 1].price < highs[0].price;
  const lowerLows = lows[lows.length - 1].price < lows[0].price;

  if (higherHighs && higherLows) {
    return res("market_structure", "Market Structure", "bullish", 10, "Struktur Higher-High & Higher-Low — bias bullish (Break of Structure).");
  }
  if (lowerHighs && lowerLows) {
    return res("market_structure", "Market Structure", "bearish", 10, "Struktur Lower-High & Lower-Low — bias bearish (Break of Structure).");
  }
  if (higherHighs && lowerLows) {
    return res(
      "market_structure",
      "Market Structure",
      "neutral",
      0,
      "Struktur campuran (higher-high tapi lower-low) — indikasi Change of Character, tunggu konfirmasi lebih lanjut."
    );
  }
  return res("market_structure", "Market Structure", "neutral", 0, "Struktur pasar belum menunjukkan arah yang konsisten.");
}

// 10) Risk Assessment ---------------------------------------------------------------------------
// Unlike the 9 scanners above, Risk Assessment doesn't vote LONG/SHORT — its
// job is to judge how safe the setup itself is (volatility, R:R, macro
// calendar proximity, funding crowding) and shave Confidence down when it
// isn't. See lib/elvoid/engine.ts for how confidencePenalty is applied.
export interface RiskAssessmentResult {
  level: "low" | "medium" | "high";
  confidencePenalty: number;
  detail: string;
}

export function scanRiskAssessment(args: {
  entry: number;
  sl: number;
  tp1: number;
  atr: number;
  currentPrice: number;
  calendar: EconomicEvent[];
  funding?: FundingInfo;
}): RiskAssessmentResult {
  const { entry, sl, tp1, atr, currentPrice, calendar, funding } = args;
  const notes: string[] = [];
  let penalty = 0;

  const volatilityPct = (atr / currentPrice) * 100;
  if (volatilityPct >= 5) {
    penalty += 10;
    notes.push(`Volatilitas tinggi (ATR ~${volatilityPct.toFixed(1)}% dari harga) — pergerakan bisa lebih liar dari perkiraan.`);
  } else if (volatilityPct >= 3) {
    penalty += 4;
    notes.push(`Volatilitas cukup tinggi (ATR ~${volatilityPct.toFixed(1)}% dari harga).`);
  }

  const riskDist = Math.abs(entry - sl);
  const rrTp1 = riskDist > 0 ? Math.abs(tp1 - entry) / riskDist : 0;
  if (rrTp1 < 1.2) {
    penalty += 6;
    notes.push(`R:R ke TP1 relatif tipis (${rrTp1.toFixed(2)}R) — margin keuntungan lebih sempit dari ideal.`);
  }

  const now = Date.now();
  const nextHighImpact = calendar
    .filter((e) => e.impact === "high" && new Date(e.date).getTime() >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  if (nextHighImpact) {
    const hoursAway = (new Date(nextHighImpact.date).getTime() - now) / 36e5;
    if (hoursAway <= 24) {
      penalty += 8;
      notes.push(`Event makro high-impact ("${nextHighImpact.title}") kurang dari 24 jam lagi — volatilitas bisa melonjak tiba-tiba.`);
    } else if (hoursAway <= 48) {
      penalty += 4;
      notes.push(`Event makro high-impact dalam ~${Math.round(hoursAway)} jam — pantau kalender ekonomi.`);
    }
  }

  if (funding && Math.abs(funding.lastFundingRate) > 0.0015) {
    penalty += 3;
    notes.push(`Funding rate ${(funding.lastFundingRate * 100).toFixed(3)}% tergolong crowded — risiko squeeze dua arah meningkat.`);
  }

  const level: "low" | "medium" | "high" = penalty >= 15 ? "high" : penalty >= 7 ? "medium" : "low";
  if (!notes.length) notes.push("Tidak ada red flag tambahan dari volatilitas, kalender makro, atau funding saat ini.");

  return { level, confidencePenalty: Math.min(20, penalty), detail: notes.join(" ") };
}
