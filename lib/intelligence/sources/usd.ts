import { cached } from "@/lib/cache";
import { fetchTwelveDataSeries, type MarketSeriesReading } from "./twelvedata";

// ---------------------------------------------------------------------------
// USD strength (DXY) for the Global Intelligence Map's USD node.
//
// Provider: TwelveData (https://twelvedata.com), free tier: 8 requests/min,
// 800/day. Needs TWELVEDATA_API_KEY in .env.local — without it this returns
// `undefined` and the map shows "Waiting for API Connection" on the USD
// node, same graceful-degrade rule as lib/macro.ts.
//
// Honesty note: index-symbol coverage (DXY) depends on your TwelveData plan
// — verify at https://twelvedata.com/symbolsearch?s=DXY before relying on
// this in production. If DXY isn't reachable on your plan, either upgrade
// or point USD_SYMBOL at a proxy your plan does cover; lib/macro.ts's
// FRED-based getDxyProxy() (DTWEXBGS, free, no plan restriction, but only
// ~daily resolution) is the existing fallback used on the Market Overview
// strip and can be wired in here the same way if you'd rather not depend on
// TwelveData for this specific node.
// ---------------------------------------------------------------------------

const USD_SYMBOL = "DXY";

export type { MarketSeriesReading };

export async function getUsdReading(): Promise<MarketSeriesReading | undefined> {
  return cached("intel:usd", 30_000, () => fetchTwelveDataSeries(USD_SYMBOL));
}
