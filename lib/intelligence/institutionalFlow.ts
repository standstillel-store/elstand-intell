import type { TrendTone } from "./shared";
import type { SmartMoneyEntry } from "@/lib/scanner-categories";

// ---------------------------------------------------------------------------
// Institutional Flow panel — ETF Flow, Smart Money Activity, Institutional
// Movement.
//
// Not yet wired: spot BTC/ETH ETF daily net flow has no free, no-key API in
// this codebase today. Farside Investors and SoSoValue publish daily flow
// tables that could be scraped, or a paid data vendor could be added the
// same way FRED/Alchemy are gated behind an env var elsewhere in lib/.
// Smart Money Activity CAN be wired for real — it's the same on-chain whale
// accumulation read already computed in lib/scanner-categories.ts.
// ---------------------------------------------------------------------------

export interface EtfFlowEntry {
  ticker: string;
  name: string;
  asset: "BTC" | "ETH";
  netFlowUsd: number;
  sample?: boolean;
}

export interface InstitutionalMovementEntry {
  label: string;
  detail: string;
  tone: TrendTone;
  sample?: boolean;
}

export interface InstitutionalFlowData {
  etfFlows: EtfFlowEntry[];
  etfNetTotalUsd: number;
  movements: InstitutionalMovementEntry[];
}

export function getSampleInstitutionalFlow(): InstitutionalFlowData {
  const etfFlows: EtfFlowEntry[] = [
    { ticker: "IBIT", name: "iShares Bitcoin Trust", asset: "BTC", netFlowUsd: 182_000_000, sample: true },
    { ticker: "FBTC", name: "Fidelity Wise Origin Bitcoin Fund", asset: "BTC", netFlowUsd: 64_000_000, sample: true },
    { ticker: "GBTC", name: "Grayscale Bitcoin Trust", asset: "BTC", netFlowUsd: -41_000_000, sample: true },
    { ticker: "ETHA", name: "iShares Ethereum Trust", asset: "ETH", netFlowUsd: 37_000_000, sample: true },
    { ticker: "FETH", name: "Fidelity Ethereum Fund", asset: "ETH", netFlowUsd: 12_000_000, sample: true },
  ];
  const etfNetTotalUsd = etfFlows.reduce((s, e) => s + e.netFlowUsd, 0);

  const movements: InstitutionalMovementEntry[] = [
    {
      label: "Spot BTC ETF net inflow 4 hari beruntun",
      detail: "Total inflow > $200M dalam 4 sesi terakhir, dipimpin IBIT & FBTC.",
      tone: "up",
      sample: true,
    },
    {
      label: "GBTC masih mencatat outflow",
      detail: "Pola redemption berlanjut, namun besarannya mengecil dibanding kuartal lalu.",
      tone: "down",
      sample: true,
    },
    {
      label: "Aktivitas custodial wallet meningkat",
      detail: "Transfer besar ke alamat yang diasosiasikan dengan custodian institusional.",
      tone: "neutral",
      sample: true,
    },
  ];

  return { etfFlows, etfNetTotalUsd, movements };
}

/** Fallback for when live buildSmartMoneyAccumulation() output isn't passed in. */
export function getSampleSmartMoneyEntries(): SmartMoneyEntry[] {
  return [
    { symbol: "ETH", netInflowUsd: 18_400_000, txCount: 14, change24h: 2.1 },
    { symbol: "SOL", netInflowUsd: 9_200_000, txCount: 9, change24h: 4.8 },
    { symbol: "ONDO", netInflowUsd: 3_100_000, txCount: 6, change24h: 6.2 },
  ];
}
