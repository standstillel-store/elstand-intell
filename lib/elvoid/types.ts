// ---------------------------------------------------------------------------
// Types for ElVoid AI's signal engine and its Supabase-backed tables. Field
// names on the DB-facing interfaces intentionally match the Postgres column
// names 1:1 (see supabase/schema.sql) so rows read straight off the
// Supabase client with no mapping layer to keep in sync.
// ---------------------------------------------------------------------------

export type SignalSide = "LONG" | "SHORT";
export type SignalStatus = "new" | "open" | "tp1_hit" | "closed" | "invalidated" | "expired";
export type TradeResult = "win" | "loss" | "breakeven";

export interface AiSignal {
  id: string;
  coin: string;
  side: SignalSide;
  entry: number;
  sl: number;
  tp1: number;
  tp2: number;
  tp3: number | null;
  timeframe: string;
  confidence: number;
  risk_percent: number;
  reason: string;
  strategy: string;
  status: SignalStatus;
  /** Structured scan snapshot from generation time — powers the AI Reasoning checklist. Null for signals saved before the 2026-07 redesign. */
  scans: ScanResult[] | null;
  extra_reasoning: ScanResult[] | null;
  created_at: string;
}

export interface AiJournalEntry {
  id: string;
  signal_id: string | null;
  result: TradeResult;
  profit_percent: number;
  rr: number;
  duration_minutes: number | null;
  notes: string | null;
  screenshot_url: string | null;
  closed_at: string;
}

export interface AiStatistics {
  total_trade: number;
  wins: number;
  losses: number;
  win_rate: number;
  average_rr: number;
  profit_factor: number;
  max_drawdown: number;
  total_profit: number;
  updated_at: string;
}

export interface PaperWallet {
  balance: number;
  equity: number;
  total_profit: number;
  risk_per_trade: number;
  updated_at: string;
}

/** A closed trade with its originating signal joined in, for journal/table display. */
export interface JournalWithSignal extends AiJournalEntry {
  signal: Pick<AiSignal, "coin" | "side" | "strategy" | "confidence" | "entry" | "reason" | "timeframe"> | null;
}

/** One scanner's read — the building block every ElVoid AI signal is assembled from. */
export interface ScanResult {
  key: string; // e.g. "support_resistance"
  label: string; // e.g. "Support & Resistance"
  bias: "bullish" | "bearish" | "neutral";
  weight: number; // points contributed toward the winning side; 0 when neutral
  detail: string; // human-readable, Bahasa Indonesia
}

export interface Candle {
  time: number; // ms epoch, candle open time
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
