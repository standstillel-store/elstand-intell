// ---------------------------------------------------------------------------
// Shared, transparent, rule-based helpers for the Market Intelligence
// dashboard (Global Intelligence Map, Sector Rotation, Altcoin Scanner).
// Same philosophy as lib/scoring.ts and lib/market-insights.ts elsewhere in
// this app: every number on screen should be traceable to a simple rule, not
// a black-box model. Nothing here predicts price; it only labels what the
// data already shows.
// ---------------------------------------------------------------------------

export function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

export type TrendTone = "up" | "down" | "neutral";

/** Wider palette for UI elements that also need a highlighted/"watch" state. */
export type DisplayTone = TrendTone | "amber";

export interface TrendReading {
  label: string;
  tone: TrendTone;
}

/** Simple 24h/7d agreement rule — only calls Bullish/Bearish when both windows agree. */
export function deriveTrend(change24h?: number, change7d?: number): TrendReading {
  const c24 = change24h ?? 0;
  const c7 = change7d ?? c24;
  if (c24 > 0.5 && c7 > 0) return { label: "Bullish", tone: "up" };
  if (c24 < -0.5 && c7 < 0) return { label: "Bearish", tone: "down" };
  return { label: "Netral", tone: "neutral" };
}

export type MarketStatus = "risk-on" | "neutral" | "risk-off";

export interface MarketStatusReading {
  status: MarketStatus;
  label: string;
  reason: string;
  signalsCounted: number;
}

/**
 * Market Status (Risk On / Neutral / Risk Off) — a small, transparent vote
 * across up to three independent signals: Fear & Greed, 24h total market cap
 * change, and DXY (USD strength) direction. Each signal casts at most one
 * vote; the label is only ever as confident as the number of signals that
 * agree. This mirrors the same causal chain shown on the Global Intelligence
 * Map (USD strength -> liquidity -> crypto pressure), so the badge and the
 * map never contradict each other.
 */
export function deriveMarketStatus(input: {
  fngValue?: number;
  mcChange24h?: number;
  dxyChangePct?: number;
}): MarketStatusReading {
  const { fngValue, mcChange24h, dxyChangePct } = input;
  let score = 0;
  let counted = 0;
  const signals: string[] = [];

  if (fngValue !== undefined) {
    counted++;
    if (fngValue >= 55) {
      score += 1;
      signals.push("Fear & Greed condong Greed");
    } else if (fngValue <= 45) {
      score -= 1;
      signals.push("Fear & Greed condong Fear");
    }
  }
  if (mcChange24h !== undefined) {
    counted++;
    if (mcChange24h > 1) {
      score += 1;
      signals.push("Market cap 24h naik");
    } else if (mcChange24h < -1) {
      score -= 1;
      signals.push("Market cap 24h turun");
    }
  }
  if (dxyChangePct !== undefined) {
    counted++;
    if (dxyChangePct < -0.15) {
      score += 1;
      signals.push("USD melemah (DXY turun)");
    } else if (dxyChangePct > 0.15) {
      score -= 1;
      signals.push("USD menguat (DXY naik)");
    }
  }

  const status: MarketStatus = score >= 2 ? "risk-on" : score <= -2 ? "risk-off" : "neutral";
  const label = status === "risk-on" ? "Risk On" : status === "risk-off" ? "Risk Off" : "Neutral";
  const reason = signals.length ? signals.join(" · ") : "Sinyal campuran, belum ada arah dominan";

  return { status, label, reason, signalsCounted: counted };
}

// ---------------------------------------------------------------------------
// Sector taxonomy — seed list only. CoinGecko/CMC category coverage is much
// larger; this is a deliberately small, readable starter map for the six
// sectors the Sector Rotation panel tracks. Extend freely as coverage grows.
// ---------------------------------------------------------------------------

export type Sector = "AI" | "RWA" | "DeFi" | "Gaming" | "Layer 1" | "Layer 2";

export const SECTOR_LIST: Sector[] = ["AI", "RWA", "DeFi", "Gaming", "Layer 1", "Layer 2"];

const SECTOR_SEED_TAGS: Record<string, Sector> = {
  // AI
  FET: "AI",
  RNDR: "AI",
  RENDER: "AI",
  TAO: "AI",
  AGIX: "AI",
  OCEAN: "AI",
  AKT: "AI",
  WLD: "AI",
  NMR: "AI",
  GRT: "AI",
  // RWA
  ONDO: "RWA",
  POLYX: "RWA",
  RIO: "RWA",
  CFG: "RWA",
  TRU: "RWA",
  OM: "RWA",
  PROPS: "RWA",
  // DeFi
  UNI: "DeFi",
  AAVE: "DeFi",
  MKR: "DeFi",
  LDO: "DeFi",
  CRV: "DeFi",
  SNX: "DeFi",
  COMP: "DeFi",
  DYDX: "DeFi",
  PENDLE: "DeFi",
  // Gaming
  SAND: "Gaming",
  AXS: "Gaming",
  IMX: "Gaming",
  GALA: "Gaming",
  ILV: "Gaming",
  MAGIC: "Gaming",
  BEAM: "Gaming",
  RON: "Gaming",
  PIXEL: "Gaming",
  // Layer 1
  ETH: "Layer 1",
  SOL: "Layer 1",
  AVAX: "Layer 1",
  SUI: "Layer 1",
  APT: "Layer 1",
  NEAR: "Layer 1",
  ADA: "Layer 1",
  DOT: "Layer 1",
  TON: "Layer 1",
  ATOM: "Layer 1",
  SEI: "Layer 1",
  // Layer 2
  ARB: "Layer 2",
  OP: "Layer 2",
  MATIC: "Layer 2",
  POL: "Layer 2",
  STRK: "Layer 2",
  ZK: "Layer 2",
  MNT: "Layer 2",
  METIS: "Layer 2",
};

export function getSectorForSymbol(symbol: string): Sector | undefined {
  return SECTOR_SEED_TAGS[symbol.toUpperCase()];
}
