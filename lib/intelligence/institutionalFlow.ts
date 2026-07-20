import type { TrendTone } from "./shared";

// ---------------------------------------------------------------------------
// Institutional Flow panel — ETF Flow, Smart Money Activity, Institutional
// Movement.
//
// Not yet wired: spot BTC/ETH ETF daily net flow has no free, no-key API in
// this codebase today. Farside Investors and SoSoValue publish daily flow
// tables that could be scraped, or a paid data vendor could be added the
// same way FRED/Alchemy are gated behind an env var elsewhere in lib/. Until
// then this returns an empty result on purpose — the panel shows "Waiting
// for API Connection" rather than a placeholder number.
//
// Smart Money Activity is NOT included here — it's already real, computed
// by lib/scanner-categories.ts's buildSmartMoneyAccumulation() from live
// on-chain data, and passed into the panel directly by the dashboard page.
// ---------------------------------------------------------------------------

export interface EtfFlowEntry {
  ticker: string;
  name: string;
  asset: "BTC" | "ETH";
  netFlowUsd: number;
}

export interface InstitutionalMovementEntry {
  label: string;
  detail: string;
  tone: TrendTone;
}

export interface InstitutionalFlowData {
  etfFlows: EtfFlowEntry[];
  etfNetTotalUsd: number;
  movements: InstitutionalMovementEntry[];
  connected: boolean;
}

/**
 * Returns an honest empty state today. Swap the body of this function for a
 * real fetch (Farside/SoSoValue scrape, or a paid ETF-flow API) and the
 * panel starts rendering live numbers with no changes needed on the UI side
 * — same "gated by data, not by code" pattern as the rest of lib/intelligence.
 */
export function getInstitutionalFlowData(): InstitutionalFlowData {
  return { etfFlows: [], etfNetTotalUsd: 0, movements: [], connected: false };
}
