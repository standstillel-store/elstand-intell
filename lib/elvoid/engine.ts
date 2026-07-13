import type { Candle, ScanResult, SignalSide } from "./types";
import type { WhaleTransfer, NewsItem, EconomicEvent, FundingInfo } from "../types";
import { findSwingPoints, findSupportResistance, detectTrend, volumeAnomaly, atr as atrSeries } from "./indicators";
import {
  scanSupportResistance,
  scanPriceAction,
  scanLiquiditySweep,
  scanLiquidityPool,
  scanTrend,
  scanVolume,
  scanWhaleActivity,
  scanNewsSentiment,
  scanMarketStructure,
  scanRiskAssessment,
} from "./scanners";

// ---------------------------------------------------------------------------
// The orchestrator: runs all 10 ElVoid AI scanners over a coin's candles +
// live context, then assembles a directional signal exactly like a discretionary
// trader would — pick a side from the weight of evidence, place the stop
// beyond the nearest protective structure, place targets at the nearest
// opposing liquidity (falling back to fixed R-multiples), and only ever
// report Confidence as a capped, corroboration-based probability — never
// certainty. See README / methodology for the full philosophy.
// ---------------------------------------------------------------------------

export interface GeneratedSignal {
  coin: string;
  side: SignalSide;
  entry: number;
  sl: number;
  tp1: number;
  tp2: number;
  confidence: number;
  risk_percent: number;
  reason: string;
  strategy: string;
  scans: ScanResult[];
  riskLevel: "low" | "medium" | "high";
}

export interface StrategyCalibration {
  strategy: string;
  winRate: number;
  sampleSize: number;
}

/**
 * AI belajar dari histori paper trade: a strategy with an established (>=5
 * trade) historical win rate nudges future Confidence for that same
 * strategy label up or down — capped at +/-8 points so history informs the
 * score without ever dominating it or implying certainty.
 */
function calibrationAdjustment(strategy: string, calibration: StrategyCalibration[]): number {
  const match = calibration.find((c) => c.strategy === strategy);
  if (!match || match.sampleSize < 5) return 0;
  const raw = (match.winRate - 50) * 0.3;
  return Math.max(-8, Math.min(8, raw));
}

function classifyStrategy(scans: ScanResult[], side: SignalSide): string {
  const winningBias = side === "LONG" ? "bullish" : "bearish";
  const has = (key: string, minWeight = 8) => scans.some((s) => s.key === key && s.bias === winningBias && s.weight >= minWeight);

  if (has("liquidity_sweep", 12)) return "Liquidity Sweep Reversal";
  if (has("market_structure", 8) && has("price_action", 6)) return "Change of Character Reversal";
  if (has("trend", 10) && has("support_resistance", 6)) return "Trend Continuation Pullback";
  if (has("support_resistance", 8) && has("volume", 6)) return "Support/Resistance Reaction";
  if (has("liquidity_pool", 5)) return "Liquidity Pool Draw";
  if (has("trend", 8)) return "Trend Following";
  return "Confluence Setup";
}

function roundPrice(price: number): number {
  if (price >= 1000) return Math.round(price * 100) / 100;
  if (price >= 1) return Math.round(price * 10000) / 10000;
  if (price >= 0.01) return Math.round(price * 1e6) / 1e6;
  return Math.round(price * 1e9) / 1e9;
}

export function generateSignal(params: {
  symbol: string; // e.g. "BTC"
  currentPrice: number;
  candles: Candle[];
  whales: WhaleTransfer[];
  news: NewsItem[];
  calendar: EconomicEvent[];
  funding?: FundingInfo;
  name?: string;
  riskPercent?: number;
  calibration?: StrategyCalibration[];
}): GeneratedSignal | null {
  const { symbol, currentPrice, candles, whales, news, calendar, funding, name, riskPercent = 1, calibration = [] } = params;
  if (candles.length < 30 || !currentPrice) return null;

  // --- Shared indicators, computed once and handed to every scanner -------
  const swings = findSwingPoints(candles, 3);
  const srLevels = findSupportResistance(candles, currentPrice);
  const trend = detectTrend(candles);
  const { ratio, spiking } = volumeAnomaly(candles);
  const atrValues = atrSeries(candles, 14);
  const lastAtr = atrValues[atrValues.length - 1] || currentPrice * 0.02;

  // --- 1-9: directional scanners -------------------------------------------
  const directional: ScanResult[] = [
    scanSupportResistance(currentPrice, srLevels),
    scanPriceAction(candles),
    scanLiquiditySweep(candles, swings, lastAtr),
    scanLiquidityPool(currentPrice, swings),
    scanTrend(trend),
    scanVolume(candles, ratio, spiking),
    scanWhaleActivity(whales, symbol),
    scanNewsSentiment(news, symbol, name ?? symbol),
    scanMarketStructure(swings),
  ];

  const bullScore = directional.filter((s) => s.bias === "bullish").reduce((sum, s) => sum + s.weight, 0);
  const bearScore = directional.filter((s) => s.bias === "bearish").reduce((sum, s) => sum + s.weight, 0);
  const side: SignalSide = bullScore >= bearScore ? "LONG" : "SHORT";
  const corroborating = directional.filter((s) => s.bias === (side === "LONG" ? "bullish" : "bearish") && s.weight > 0).length;

  const dir = side === "LONG" ? 1 : -1;
  const entry = currentPrice;

  // --- Stop Loss: beyond the nearest protective S/R level + a small ATR buffer ---
  const protectiveLevels = srLevels
    .filter((l) => (side === "LONG" ? l.type === "support" : l.type === "resistance"))
    .map((l) => ({ price: l.price, dist: dir * (entry - l.price) }))
    .filter((l) => l.dist > 0)
    .sort((a, b) => a.dist - b.dist);

  const atrBuffer = lastAtr * 0.3;
  const slDist = protectiveLevels[0] ? protectiveLevels[0].dist + atrBuffer : lastAtr * 1.5;
  const sl = entry - dir * slDist;
  const riskDistance = Math.abs(entry - sl);

  // --- Targets: nearest opposing liquidity level, falling back to fixed R-multiples ---
  const opposingLevels = srLevels
    .filter((l) => (side === "LONG" ? l.type === "resistance" : l.type === "support"))
    .map((l) => ({ price: l.price, dist: dir * (l.price - entry) }))
    .filter((l) => l.dist > 0)
    .sort((a, b) => a.dist - b.dist);

  const rawTp1Dist = riskDistance * 1.5;
  const rawTp2Dist = riskDistance * 2.75;
  const tp1Candidate = opposingLevels.find((l) => l.dist >= riskDistance * 1.0 && l.dist <= riskDistance * 2.2);
  const tp1Dist = tp1Candidate ? tp1Candidate.dist : rawTp1Dist;
  const tp1 = entry + dir * tp1Dist;
  const tp2Candidate = opposingLevels.find((l) => l.dist > tp1Dist * 1.15);
  const tp2Dist = tp2Candidate ? tp2Candidate.dist : Math.max(rawTp2Dist, tp1Dist * 1.6);
  const tp2 = entry + dir * tp2Dist;

  // --- 10: Risk Assessment (confidence modifier, not a directional vote) ---
  const risk = scanRiskAssessment({ entry, sl, tp1, atr: lastAtr, currentPrice, calendar, funding });

  const strategy = classifyStrategy(directional, side);
  const calibAdj = calibrationAdjustment(strategy, calibration);
  const baseConfidence = 28 + corroborating * 7;
  // Confidence never claims certainty — capped well short of 100, same rule
  // the rest of Nocturn's scoring engine follows.
  const confidence = Math.max(8, Math.min(92, Math.round(baseConfidence + calibAdj - risk.confidencePenalty)));

  const topReasons = directional
    .filter((s) => s.bias === (side === "LONG" ? "bullish" : "bearish") && s.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5)
    .map((s) => `${s.label}: ${s.detail}`);

  const reasonLines = [
    `ElVoid AI membaca ${corroborating} dari 9 kategori indikator condong ${side === "LONG" ? "bullish" : "bearish"} untuk ${symbol}.`,
    ...topReasons,
    `Risk Assessment (${risk.level.toUpperCase()}): ${risk.detail}`,
    "Ini adalah probability berbasis data, bukan kepastian — selalu terapkan position sizing yang disiplin.",
  ];

  return {
    coin: symbol.toUpperCase(),
    side,
    entry: roundPrice(entry),
    sl: roundPrice(sl),
    tp1: roundPrice(tp1),
    tp2: roundPrice(tp2),
    confidence,
    risk_percent: riskPercent,
    reason: reasonLines.join(" "),
    strategy,
    scans: directional,
    riskLevel: risk.level,
  };
}
