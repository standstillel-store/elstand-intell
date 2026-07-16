import type { Candle, ScanResult } from "./types";
import type { NewsItem, WhaleTransfer, EconomicEvent, FundingInfo } from "../types";
import type { SrLevel, TrendReading, SwingPoint } from "./indicators";
import { calcMacd } from "./indicators";

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

// ---------------------------------------------------------------------------
// Extended AI Reasoning scanners (2026-07 UI redesign)
// ---------------------------------------------------------------------------
// These 5 are intentionally kept OUT of the confidence-weighted vote above —
// engine.ts's base 28 + corroborating*7 math was calibrated against the
// original 9 scanners, and changing that denominator would silently shift
// every historical Confidence number. Instead these feed a separate
// `extraReasoning` array purely for the AI Reasoning checklist UI: same
// transparent, rule-based philosophy, just presentational rather than
// vote-affecting. See lib/elvoid/engine.ts.

function shortUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

/**
 * Fair Value Gap (ICT): a 3-candle imbalance where candle[i-2] and candle[i]
 * don't overlap. Scans the most recent ~18 candles for the latest gap that
 * hasn't since been "mitigated" (price hasn't traded back into it).
 */
export function scanFairValueGap(candles: Candle[]): ScanResult {
  const n = candles.length;
  if (n < 20) return res("fair_value_gap", "Fair Value Gap", "neutral", 0, "Data candle belum cukup untuk mendeteksi Fair Value Gap.");

  for (let i = n - 3; i >= Math.max(2, n - 18); i--) {
    const left = candles[i - 2];
    const right = candles[i];
    const later = candles.slice(i + 1);

    if (left.high < right.low) {
      const stillOpen = !later.some((c) => c.low <= right.low && c.low >= left.high);
      if (stillOpen) {
        return res(
          "fair_value_gap",
          "Fair Value Gap",
          "bullish",
          9,
          `FVG bullish belum termitigasi di area ${left.high.toFixed(4)}–${right.low.toFixed(4)}.`
        );
      }
    }
    if (left.low > right.high) {
      const stillOpen = !later.some((c) => c.high >= right.high && c.high <= left.low);
      if (stillOpen) {
        return res(
          "fair_value_gap",
          "Fair Value Gap",
          "bearish",
          9,
          `FVG bearish belum termitigasi di area ${right.high.toFixed(4)}–${left.low.toFixed(4)}.`
        );
      }
    }
  }
  return res("fair_value_gap", "Fair Value Gap", "neutral", 0, "Tidak ada Fair Value Gap terbuka yang signifikan saat ini.");
}

/**
 * Order Block (simplified ICT read): finds the single most impulsive candle
 * in the last 15 bars, then checks whether the opposite-colored candle right
 * before it — the "order block" — is near the current price (i.e. price has
 * returned to that zone, the classic re-entry read).
 */
export function scanOrderBlock(candles: Candle[]): ScanResult {
  const n = candles.length;
  if (n < 16) return res("order_block", "Order Block", "neutral", 0, "Data candle belum cukup untuk mendeteksi Order Block.");

  const window = candles.slice(-15);
  const avgRange = window.reduce((s, c) => s + (c.high - c.low), 0) / window.length || 1e-9;

  let bestIdx = -1;
  let bestBody = 0;
  for (let i = 1; i < window.length; i++) {
    const body = Math.abs(window[i].close - window[i].open);
    if (body > bestBody) {
      bestBody = body;
      bestIdx = i;
    }
  }
  if (bestIdx < 1 || bestBody < avgRange * 1.3) {
    return res("order_block", "Order Block", "neutral", 0, "Belum ada impulsive move yang cukup kuat untuk menandai Order Block.");
  }

  const impulse = window[bestIdx];
  const prior = window[bestIdx - 1];
  const currentPrice = candles[n - 1].close;
  const impulseBullish = impulse.close > impulse.open;
  const priorBearish = prior.close < prior.open;
  const priorBullish = prior.close > prior.open;

  if (impulseBullish && priorBearish) {
    const obLow = prior.low;
    const obHigh = prior.open;
    const near = currentPrice <= obHigh * 1.01 && currentPrice >= obLow * 0.99;
    return res(
      "order_block",
      "Order Block",
      "bullish",
      near ? 10 : 5,
      near
        ? `Harga kembali menguji Bullish Order Block (${obLow.toFixed(4)}–${obHigh.toFixed(4)}).`
        : `Bullish Order Block teridentifikasi di ${obLow.toFixed(4)}–${obHigh.toFixed(4)}, harga belum kembali ke area ini.`
    );
  }
  if (!impulseBullish && priorBullish) {
    const obLow = prior.open;
    const obHigh = prior.high;
    const near = currentPrice <= obHigh * 1.01 && currentPrice >= obLow * 0.99;
    return res(
      "order_block",
      "Order Block",
      "bearish",
      near ? 10 : 5,
      near
        ? `Harga kembali menguji Bearish Order Block (${obLow.toFixed(4)}–${obHigh.toFixed(4)}).`
        : `Bearish Order Block teridentifikasi di ${obLow.toFixed(4)}–${obHigh.toFixed(4)}, harga belum kembali ke area ini.`
    );
  }
  return res("order_block", "Order Block", "neutral", 0, "Order Block terakhir tidak searah dengan candle impulsive saat ini.");
}

/** Funding, surfaced as its own explicit AI Reasoning line (also folded into Risk Assessment above). */
export function scanFundingRate(funding?: FundingInfo): ScanResult {
  if (!funding) return res("funding_rate", "Funding", "neutral", 0, "Data funding rate tidak tersedia untuk pair ini.");
  const pct = (funding.lastFundingRate * 100).toFixed(4);
  if (funding.lastFundingRate < -0.0005) {
    return res("funding_rate", "Funding", "bullish", 8, `Funding rate negatif (${pct}%) — short membayar long, berpotensi short squeeze.`);
  }
  if (funding.lastFundingRate > 0.0015) {
    return res("funding_rate", "Funding", "bearish", 6, `Funding rate crowded positif (${pct}%) — long membayar premium, rawan long squeeze.`);
  }
  return res("funding_rate", "Funding", "neutral", 0, `Funding rate netral (${pct}%).`);
}

/**
 * Open Interest — honest by design: only a single snapshot value is
 * available (no OI history), so this never claims OI is "rising" or
 * "falling". It only flags when a large OI figure lines up with the
 * direction price already moved, i.e. positioning size that's consistent
 * with the move rather than fighting it.
 */
export function scanOpenInterest(funding?: FundingInfo, change24h?: number): ScanResult {
  if (!funding?.openInterestValue) {
    return res("open_interest", "Open Interest", "neutral", 0, "Data open interest tidak tersedia untuk pair ini.");
  }
  const oiUsd = funding.openInterestValue;
  const chg = change24h ?? 0;
  if (oiUsd > 50_000_000 && chg > 2) {
    return res("open_interest", "Open Interest", "bullish", 7, `Open interest besar (${shortUsd(oiUsd)}) selaras dengan kenaikan harga.`);
  }
  if (oiUsd > 50_000_000 && chg < -2) {
    return res("open_interest", "Open Interest", "bearish", 7, `Open interest besar (${shortUsd(oiUsd)}) selaras dengan penurunan harga.`);
  }
  return res("open_interest", "Open Interest", "neutral", 0, `Open interest ${shortUsd(oiUsd)}, belum menunjukkan bias kuat.`);
}

/**
 * SMT (Smart Money Divergence) — simplified proxy: compares this asset's
 * 24h read against BTC's own 24h/7d trend instead of a full cross-pair
 * swing-structure comparison (that would need BTC's candle series threaded
 * through the whole engine). Labeled clearly so it's never mistaken for
 * more precision than it has.
 */
export function scanSmtDivergence(params: {
  symbolChange24h?: number;
  btcChange24h?: number;
  btcChange7d?: number;
}): ScanResult {
  const { symbolChange24h, btcChange24h, btcChange7d } = params;
  if (symbolChange24h === undefined || btcChange24h === undefined || btcChange7d === undefined) {
    return res("smt_divergence", "SMT (Smart Money Divergence)", "neutral", 0, "Data BTC pembanding tidak tersedia untuk membaca SMT.");
  }
  const btcStillStrong = btcChange7d > 0 && btcChange24h > -1;
  const symbolFading = symbolChange24h < -2 && symbolChange24h < btcChange24h - 3;
  if (btcStillStrong && symbolFading) {
    return res(
      "smt_divergence",
      "SMT (Smart Money Divergence)",
      "bearish",
      7,
      "BTC masih kuat namun aset ini melemah lebih dulu — indikasi divergensi distribusi."
    );
  }
  const btcStillWeak = btcChange7d < 0 && btcChange24h < 1;
  const symbolLeading = symbolChange24h > 2 && symbolChange24h > btcChange24h + 3;
  if (btcStillWeak && symbolLeading) {
    return res(
      "smt_divergence",
      "SMT (Smart Money Divergence)",
      "bullish",
      7,
      "BTC masih tertekan namun aset ini menguat lebih dulu — indikasi divergensi akumulasi."
    );
  }
  return res("smt_divergence", "SMT (Smart Money Divergence)", "neutral", 0, "Tidak ada divergensi signifikan terhadap BTC saat ini.");
}

/** MACD (12/26/9) — histogram sign for trend, plus extra weight on a fresh crossover this candle. */
export function scanMacd(candles: Candle[]): ScanResult {
  const macd = calcMacd(candles);
  if (!macd) return res("macd", "MACD", "neutral", 0, "Data candle belum cukup untuk menghitung MACD (butuh minimal 35 candle).");

  const crossText = macd.crossover === "bullish_cross" ? " Golden cross baru saja terjadi." : macd.crossover === "bearish_cross" ? " Death cross baru saja terjadi." : "";

  if (macd.trend === "bullish") {
    const weight = macd.crossover === "bullish_cross" ? 9 : 5;
    return res("macd", "MACD", "bullish", weight, `Histogram MACD positif (${macd.histogram.toFixed(4)}).${crossText}`);
  }
  if (macd.trend === "bearish") {
    const weight = macd.crossover === "bearish_cross" ? 9 : 5;
    return res("macd", "MACD", "bearish", weight, `Histogram MACD negatif (${macd.histogram.toFixed(4)}).${crossText}`);
  }
  return res("macd", "MACD", "neutral", 0, "Histogram MACD mendekati nol — momentum netral.");
}

/**
 * Stablecoin Flow — market-wide liquidity backdrop, not symbol-specific.
 * Rising total stablecoin supply usually means fresh capital sitting on
 * exchanges/DeFi ready to buy; shrinking supply means capital leaving the
 * crypto ecosystem entirely. Applied the same way to every symbol's
 * analysis, same as a macro overlay.
 */
export function scanStablecoinFlow(stableChange24hUsd?: number): ScanResult {
  if (stableChange24hUsd === undefined) {
    return res("stablecoin_flow", "Stablecoin Flow", "neutral", 0, "Data stablecoin supply tidak tersedia saat ini.");
  }
  if (stableChange24hUsd > 150_000_000) {
    return res(
      "stablecoin_flow",
      "Stablecoin Flow",
      "bullish",
      6,
      `Supply stablecoin naik ${formatShortUsdSigned(stableChange24hUsd)} dalam 24 jam — likuiditas baru masuk ke ekosistem crypto.`
    );
  }
  if (stableChange24hUsd < -150_000_000) {
    return res(
      "stablecoin_flow",
      "Stablecoin Flow",
      "bearish",
      6,
      `Supply stablecoin turun ${formatShortUsdSigned(stableChange24hUsd)} dalam 24 jam — likuiditas keluar dari ekosistem crypto.`
    );
  }
  return res("stablecoin_flow", "Stablecoin Flow", "neutral", 0, "Supply stablecoin relatif stabil dalam 24 jam terakhir.");
}

function formatShortUsdSigned(n: number): string {
  const sign = n >= 0 ? "+" : "-";
  return `${sign}${shortUsd(Math.abs(n))}`;
}
