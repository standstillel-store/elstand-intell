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
  scanFairValueGap,
  scanOrderBlock,
  scanFundingRate,
  scanOpenInterest,
  scanSmtDivergence,
  scanMacd,
  scanStablecoinFlow,
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
  tp3: number;
  timeframe: string;
  confidence: number;
  risk_percent: number;
  reason: string;
  strategy: string;
  scans: ScanResult[];
  /** Presentational-only extras (FVG, Order Block, Funding, Open Interest, SMT, MACD, Stablecoin Flow) — see scanners.ts note. Never affects side/entry/sl/tp/confidence. */
  extraReasoning: ScanResult[];
  riskLevel: "low" | "medium" | "high";
  /** A+/A/B/C — a coarse, at-a-glance read of Confidence + corroboration count + risk level. Not a separate model. */
  tradeGrade: "A+" | "A" | "B" | "C";
  /** Estimated probability of reaching a take-profit target before Stop Loss, 15-85 — blended from strategy-calibration history when enough samples exist, otherwise scaled down from Confidence. Complementary with probabilitySl by construction (a simplification: doesn't separately model "invalidated/expired" outcomes). Never a guarantee. */
  probabilityTp: number;
  probabilitySl: number;
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

/** A+/A/B/C at-a-glance grade — pure re-read of Confidence + corroboration + risk, not a separate model. */
function computeTradeGrade(confidence: number, corroborating: number, riskLevel: "low" | "medium" | "high"): "A+" | "A" | "B" | "C" {
  if (confidence >= 82 && corroborating >= 6 && riskLevel !== "high") return "A+";
  if (confidence >= 70 && corroborating >= 5) return "A";
  if (confidence >= 55) return "B";
  return "C";
}

/**
 * Probability TP is an ESTIMATE, not a guarantee: blended from the
 * strategy's historical win rate (when at least 5 closed trades exist for
 * that exact strategy label) and Confidence, weighted toward real history
 * as the sample size grows. With no history yet, it's scaled down from
 * Confidence rather than presented at face value — Confidence measures
 * "how many things agree right now", not a calibrated hit rate.
 * Probability SL = 100 - Probability TP by construction; this is a
 * simplification that treats every trade as a binary TP-or-SL outcome and
 * doesn't separately model "invalidated" or "expired" exits.
 */
function estimateProbabilities(confidence: number, strategy: string, calibration: StrategyCalibration[]): { probabilityTp: number; probabilitySl: number } {
  const match = calibration.find((c) => c.strategy === strategy);
  let raw: number;
  if (match && match.sampleSize >= 5) {
    const historyWeight = Math.min(0.7, match.sampleSize / 30);
    raw = match.winRate * historyWeight + confidence * (1 - historyWeight);
  } else {
    raw = confidence * 0.85;
  }
  const probabilityTp = Math.max(15, Math.min(85, Math.round(raw)));
  return { probabilityTp, probabilitySl: 100 - probabilityTp };
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
  timeframe?: string;
  change24h?: number;
  btcChange24h?: number;
  btcChange7d?: number;
  stableChange24hUsd?: number;
}): GeneratedSignal | null {
  const {
    symbol,
    currentPrice,
    candles,
    whales,
    news,
    calendar,
    funding,
    name,
    riskPercent = 1,
    calibration = [],
    timeframe = "4h",
    change24h,
    btcChange24h,
    btcChange7d,
    stableChange24hUsd,
  } = params;
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

  // --- TP3: the furthest opposing liquidity level beyond TP2, falling back to a fixed 4.25R runner target ---
  const rawTp3Dist = riskDistance * 4.25;
  const tp3Candidate = opposingLevels.find((l) => l.dist > tp2Dist * 1.15);
  const tp3Dist = tp3Candidate ? tp3Candidate.dist : Math.max(rawTp3Dist, tp2Dist * 1.5);
  const tp3 = entry + dir * tp3Dist;

  // --- 10: Risk Assessment (confidence modifier, not a directional vote) ---
  const risk = scanRiskAssessment({ entry, sl, tp1, atr: lastAtr, currentPrice, calendar, funding });

  // --- Extended, presentational-only reasoning (does not affect side/confidence) ---
  const extraReasoning: ScanResult[] = [
    scanFairValueGap(candles),
    scanOrderBlock(candles),
    scanFundingRate(funding),
    scanOpenInterest(funding, change24h),
    scanSmtDivergence({ symbolChange24h: change24h, btcChange24h, btcChange7d }),
    scanMacd(candles),
    scanStablecoinFlow(stableChange24hUsd),
  ];

  const strategy = classifyStrategy(directional, side);
  const calibAdj = calibrationAdjustment(strategy, calibration);
  const baseConfidence = 28 + corroborating * 7;
  // Confidence never claims certainty — capped well short of 100, same rule
  // the rest of ElVoid AI's scoring engine follows.
  const confidence = Math.max(8, Math.min(92, Math.round(baseConfidence + calibAdj - risk.confidencePenalty)));
  const tradeGrade = computeTradeGrade(confidence, corroborating, risk.level);
  const { probabilityTp, probabilitySl } = estimateProbabilities(confidence, strategy, calibration);

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
    tp3: roundPrice(tp3),
    timeframe,
    confidence,
    risk_percent: riskPercent,
    reason: reasonLines.join(" "),
    strategy,
    scans: directional,
    extraReasoning,
    riskLevel: risk.level,
    tradeGrade,
    probabilityTp,
    probabilitySl,
  };
}
