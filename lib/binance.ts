import { cached } from "./cache";
import type { FundingInfo } from "./types";

const BASE = "https://fapi.binance.com";

// There's no free bulk open-interest endpoint, so we track OI for a curated
// watchlist of the symbols most relevant to a pump/rugpull dashboard. Add or
// remove symbols here freely.
const WATCHLIST = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "BNBUSDT",
  "XRPUSDT",
  "DOGEUSDT",
  "ADAUSDT",
  "AVAXUSDT",
  "LINKUSDT",
  "SUIUSDT",
  "PEPEUSDT",
  "WIFUSDT",
  "ARBUSDT",
  "OPUSDT",
  "TONUSDT",
];

export async function getFundingSnapshot(): Promise<FundingInfo[]> {
  return cached("bn:funding", 45_000, async () => {
    const res = await fetch(`${BASE}/fapi/v1/premiumIndex`, { next: { revalidate: 45 } });
    if (!res.ok) throw new Error(`Binance premiumIndex failed: ${res.status}`);
    const all = (await res.json()) as Array<{
      symbol: string;
      lastFundingRate: string;
      markPrice: string;
    }>;
    const wanted = new Set(WATCHLIST);
    const filtered = all.filter((r) => wanted.has(r.symbol));

    const withOi = await Promise.all(
      filtered.map(async (r) => {
        let openInterest: number | undefined;
        try {
          const oiRes = await fetch(`${BASE}/fapi/v1/openInterest?symbol=${r.symbol}`, {
            next: { revalidate: 45 },
          });
          if (oiRes.ok) {
            const oi = await oiRes.json();
            openInterest = parseFloat(oi.openInterest);
          }
        } catch {
          // OI is a nice-to-have; funding rate alone is still useful.
        }
        const markPrice = parseFloat(r.markPrice);
        const info: FundingInfo = {
          symbol: r.symbol,
          lastFundingRate: parseFloat(r.lastFundingRate),
          markPrice,
          openInterest,
          openInterestValue: openInterest ? openInterest * markPrice : undefined,
        };
        return info;
      })
    );
    return withOi;
  });
}
