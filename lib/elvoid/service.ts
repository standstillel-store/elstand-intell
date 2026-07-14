import { getTopMarkets } from "../coingecko";
import { getKlines, getFundingSnapshot } from "../binance";
import { getWhaleTransfers } from "../alchemy";
import { getNews } from "../newsapi";
import { getEconomicCalendar } from "../economiccalendar";
import { generateSignal, type GeneratedSignal } from "./engine";
import { getStrategyCalibration } from "./performance";
import { getWallet } from "./paperTrader";
import { ELVOID_WATCHLIST } from "./watchlist";
import type { CoinMarket, NewsItem, WhaleTransfer, EconomicEvent, FundingInfo } from "../types";

export interface ScanContext {
  markets: CoinMarket[];
  priceBySymbol: Record<string, number>;
  whales: WhaleTransfer[];
  news: NewsItem[];
  calendar: EconomicEvent[];
  funding: FundingInfo[];
  riskPercent: number;
  calibration: { strategy: string; winRate: number; sampleSize: number }[];
}

/** Pulls every live data source ElVoid AI needs, once, so scanning many coins doesn't refetch shared context per-coin. */
export async function buildScanContext(): Promise<ScanContext> {
  const markets = await getTopMarkets(200).catch(() => []);
  const priceBySymbol: Record<string, number> = {};
  for (const m of markets) priceBySymbol[m.symbol.toLowerCase()] = m.current_price;

  const [whales, news, calendar, funding, wallet, calibration] = await Promise.all([
    getWhaleTransfers(priceBySymbol).catch(() => []),
    getNews().catch(() => []),
    getEconomicCalendar().catch(() => []),
    getFundingSnapshot().catch(() => []),
    getWallet(),
    getStrategyCalibration().catch(() => []),
  ]);

  return { markets, priceBySymbol, whales, news, calendar, funding, riskPercent: wallet?.risk_per_trade ?? 1, calibration };
}

export async function buildSignalForSymbol(symbol: string, ctx: ScanContext): Promise<GeneratedSignal | null> {
  const sym = symbol.toUpperCase().trim();
  if (!sym) return null;
  const market = ctx.markets.find((m) => m.symbol.toUpperCase() === sym);
  const currentPrice = market?.current_price ?? ctx.priceBySymbol[sym.toLowerCase()];
  if (!currentPrice) return null;

  const timeframe = "4h";
  const candles = await getKlines(sym, timeframe, 200).catch(() => []);
  if (candles.length < 30) return null;

  const funding = ctx.funding.find((f) => f.symbol.toUpperCase() === `${sym}USDT`);
  const btc = sym === "BTC" ? undefined : ctx.markets.find((m) => m.symbol.toUpperCase() === "BTC");

  return generateSignal({
    symbol: sym,
    name: market?.name,
    currentPrice,
    candles,
    whales: ctx.whales,
    news: ctx.news,
    calendar: ctx.calendar,
    funding,
    riskPercent: ctx.riskPercent,
    calibration: ctx.calibration,
    timeframe,
    change24h: market?.price_change_percentage_24h_in_currency,
    btcChange24h: btc?.price_change_percentage_24h_in_currency,
    btcChange7d: btc?.price_change_percentage_7d_in_currency,
  });
}

/** Scans the curated watchlist and returns fresh signals sorted by Confidence, highest first. */
export async function scanWatchlist(limit = ELVOID_WATCHLIST.length): Promise<GeneratedSignal[]> {
  const ctx = await buildScanContext();
  const symbols = ELVOID_WATCHLIST.slice(0, limit);
  const results = await Promise.all(symbols.map((s) => buildSignalForSymbol(s, ctx).catch(() => null)));
  return results.filter((r): r is GeneratedSignal => r !== null).sort((a, b) => b.confidence - a.confidence);
}
