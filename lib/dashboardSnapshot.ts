import { getSnapshot, type NoctrunSnapshot } from "./snapshot";
import { getStablecoinSupply, type StablecoinReading } from "./stablecoins";
import { getDxyProxy, getM2Supply, type DxyReading, type M2Reading } from "./macro";
import {
  buildDumpCandidates,
  buildHighMomentum,
  buildSmartMoneyAccumulation,
  buildWhaleBuying,
  buildWhaleSelling,
  type MomentumCandidate,
  type SmartMoneyEntry,
  type WhaleFlowGroup,
} from "./scanner-categories";
import {
  computeAltseasonIndex,
  computeMacroStatus,
  computeWhaleSummary,
  computeSystemTagline,
  type AltseasonReading,
  type MacroReading,
  type WhaleSummary,
} from "./market-insights";
import { generateMarketSummary } from "./analysis";
import { getWallet, getDefaultWallet, getStatistics, getDefaultStatistics } from "./elvoid/paperTrader";
import { listSignals } from "./elvoid/signals";
import { getPerformanceReport, getJournalEntries } from "./elvoid/performance";
import type { AiSignal, AiStatistics, PaperWallet, JournalWithSignal } from "./elvoid/types";
import type { EquityPoint } from "./elvoid/performance";

export interface DashboardSnapshot {
  base: NoctrunSnapshot;
  stablecoin?: StablecoinReading;
  dxy?: DxyReading;
  m2?: M2Reading;
  altseason?: AltseasonReading;
  macro: MacroReading;
  whaleSummary: WhaleSummary;
  tagline: string;
  aiSummary: string;
  dumpCandidates: MomentumCandidate[];
  highMomentum: MomentumCandidate[];
  smartMoneyAccumulation: SmartMoneyEntry[];
  whaleBuying: WhaleFlowGroup[];
  whaleSelling: WhaleFlowGroup[];
  paperWallet: PaperWallet;
  paperStats: AiStatistics;
  equityCurve: EquityPoint[];
  recentTrades: JournalWithSignal[];
  openSignals: AiSignal[];
}

/**
 * Single entry point for the new Dashboard home. Runs the existing
 * getSnapshot() (CoinGecko/Binance/GeckoTerminal/Alchemy/NewsAPI/calendar)
 * alongside the new macro/stablecoin sources and every Token Scanner
 * category, in parallel, then layers in Paper Trader state. Nothing here
 * duplicates a network call getSnapshot() already makes.
 */
export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const [base, stablecoin, dxy, m2, wallet, stats, openSignals, perf, recentTrades] = await Promise.all([
    getSnapshot(),
    getStablecoinSupply().catch(() => undefined),
    getDxyProxy().catch(() => undefined),
    getM2Supply().catch(() => undefined),
    getWallet(),
    getStatistics(),
    listSignals({ status: ["new", "open", "tp1_hit"], limit: 30 }),
    getPerformanceReport().catch(() => ({ equityCurve: [] as EquityPoint[] })),
    getJournalEntries(8).catch(() => [] as JournalWithSignal[]),
  ]);

  const altseason = computeAltseasonIndex(base.markets);
  const macro = computeMacroStatus(base.calendar);
  const whaleSummary = computeWhaleSummary(base.whales);
  const tagline = computeSystemTagline(base.fng?.now.value, base.rugpullRisks.length, base.pumpCandidates.length);
  const aiSummary = generateMarketSummary(base);

  const dumpCandidates = buildDumpCandidates(base.markets, base.funding, base.whales);
  const highMomentum = buildHighMomentum(base.markets);
  const smartMoneyAccumulation = buildSmartMoneyAccumulation(base.whales, base.markets);
  const whaleBuying = buildWhaleBuying(base.whales);
  const whaleSelling = buildWhaleSelling(base.whales);

  return {
    base,
    stablecoin,
    dxy,
    m2,
    altseason,
    macro,
    whaleSummary,
    tagline,
    aiSummary,
    dumpCandidates,
    highMomentum,
    smartMoneyAccumulation,
    whaleBuying,
    whaleSelling,
    paperWallet: wallet ?? getDefaultWallet(),
    paperStats: stats ?? getDefaultStatistics(),
    equityCurve: perf.equityCurve,
    recentTrades,
    openSignals,
  };
}
