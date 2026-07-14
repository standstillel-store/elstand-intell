import { NextResponse } from "next/server";
import { getTopMarkets } from "@/lib/coingecko";
import { evaluateOpenTrades } from "@/lib/elvoid/paperTrader";

async function runSync() {
  const markets = await getTopMarkets(200).catch(() => []);
  const priceBySymbol: Record<string, number> = {};
  for (const m of markets) priceBySymbol[m.symbol.toLowerCase()] = m.current_price;
  return evaluateOpenTrades(priceBySymbol);
}

export async function POST() {
  try {
    return NextResponse.json(await runSync());
  } catch (err) {
    console.error("[ElVoid AI] sync error:", err);
    return NextResponse.json({ closed: [], stillOpen: [] });
  }
}

export async function GET() {
  try {
    return NextResponse.json(await runSync());
  } catch (err) {
    console.error("[ElVoid AI] sync error:", err);
    return NextResponse.json({ closed: [], stillOpen: [] });
  }
}
