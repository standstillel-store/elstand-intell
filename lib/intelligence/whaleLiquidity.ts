import type { WhaleTransfer, FundingInfo } from "@/lib/types";
import type { WhaleSummary } from "@/lib/market-insights";
import type { DisplayTone, TrendTone } from "./shared";

export interface WhaleTrackerCard {
  label: string;
  value: string;
  hint: string;
  tone: DisplayTone;
  sample?: boolean;
}

function formatWhaleUsd(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

/**
 * Whale Tracker cards derived from the real WhaleTransfer feed, with two
 * honesty caveats flagged inline via `sample`:
 *  - lib/alchemy.ts currently watches a handful of ERC-20 tokens (WETH,
 *    USDT, LINK, UNI, SHIB, PEPE), not native BTC — a genuine "Large BTC
 *    Transaction" needs a BTC-chain data source before this shows a real
 *    number, so it falls back to the largest tracked transfer instead.
 *  - `direction` in that feed is currently always "wallet-to-wallet" (no
 *    exchange-address tagging yet), so Exchange Inflow/Outflow can't be
 *    computed for real until specific exchange addresses are tagged. The
 *    moment that lands, this function starts returning live numbers with
 *    no changes needed here.
 */
export function buildWhaleTrackerCards(transfers: WhaleTransfer[], summary?: WhaleSummary): WhaleTrackerCard[] {
  const btcTransfers = transfers.filter((t) => t.asset.toUpperCase() === "BTC");
  const largest = btcTransfers.length ? [...btcTransfers].sort((a, b) => b.valueUsd - a.valueUsd)[0] : summary?.largest;

  const inflow = transfers.filter((t) => t.direction === "in").reduce((s, t) => s + t.valueUsd, 0);
  const outflow = transfers.filter((t) => t.direction === "out").reduce((s, t) => s + t.valueUsd, 0);
  const hasDirectionalData = transfers.some((t) => t.direction === "in" || t.direction === "out");
  const netAccumulation = outflow - inflow;

  return [
    {
      label: "Large Transaction",
      value: largest ? `${largest.asset} ${formatWhaleUsd(largest.valueUsd)}` : "—",
      hint: largest
        ? largest.direction === "wallet-to-wallet"
          ? "Wallet-to-wallet · terbesar terpantau"
          : `${largest.direction === "in" ? "Masuk" : "Keluar"} · terbesar terpantau`
        : "Belum ada transfer besar terdeteksi",
      tone: "neutral",
      sample: !btcTransfers.length,
    },
    {
      label: "Exchange Inflow",
      value: hasDirectionalData ? formatWhaleUsd(inflow) : "—",
      hint: hasDirectionalData ? "Potensi tekanan jual" : "Perlu tagging alamat exchange",
      tone: "down",
      sample: !hasDirectionalData,
    },
    {
      label: "Exchange Outflow",
      value: hasDirectionalData ? formatWhaleUsd(outflow) : "—",
      hint: hasDirectionalData ? "Sinyal potensi accumulation" : "Perlu tagging alamat exchange",
      tone: "up",
      sample: !hasDirectionalData,
    },
    {
      label: "Wallet Accumulation",
      value: hasDirectionalData ? formatWhaleUsd(netAccumulation) : summary ? formatWhaleUsd(summary.totalUsd) : "—",
      hint: hasDirectionalData ? "Net outflow dari exchange (tertimbang periode data)" : `${summary?.count ?? 0} transfer besar terpantau`,
      tone: hasDirectionalData ? (netAccumulation >= 0 ? "up" : "down") : "neutral",
      sample: !hasDirectionalData,
    },
  ];
}

export function getSampleWhaleTrackerCards(): WhaleTrackerCard[] {
  return [
    { label: "Large Transaction", value: "BTC 2,500 BTC", hint: "Keluar exchange · terbesar 24 jam", tone: "neutral", sample: true },
    { label: "Exchange Inflow", value: "$18.4M", hint: "Potensi tekanan jual", tone: "down", sample: true },
    { label: "Exchange Outflow", value: "$42.1M", hint: "Sinyal potensi accumulation", tone: "up", sample: true },
    { label: "Wallet Accumulation", value: "+$23.7M", hint: "Net outflow dari exchange (24 jam)", tone: "up", sample: true },
  ];
}

export interface LiquidityZone {
  label: string;
  range: string;
  tone: TrendTone;
}

export interface LiquidityReading {
  symbol: string;
  markPrice: number;
  openInterestUsd?: number;
  fundingRatePct?: number;
  fundingTone: DisplayTone;
  liquidationZones: LiquidityZone[];
  sample?: boolean;
}

/**
 * Open Interest & Funding Rate are real, sourced from Binance Futures via
 * lib/binance.ts (already wired, no key needed). Liquidation Zone / High
 * Liquidity Area are a heuristic band around mark price, not real order-book
 * or liquidation-heatmap data (this app has no source for that yet) — always
 * rendered with an "estimate" flag in the UI.
 */
export function buildLiquidityReading(funding: FundingInfo[], symbol = "BTCUSDT"): LiquidityReading | undefined {
  const f = funding.find((x) => x.symbol.toUpperCase() === symbol.toUpperCase());
  if (!f) return undefined;

  const fundingTone: DisplayTone = Math.abs(f.lastFundingRate) > 0.001 ? "amber" : "neutral";
  const fmt = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

  return {
    symbol: f.symbol,
    markPrice: f.markPrice,
    openInterestUsd: f.openInterestValue,
    fundingRatePct: f.lastFundingRate * 100,
    fundingTone,
    liquidationZones: [
      { label: "Liquidation cluster (long)", range: `${fmt(f.markPrice * 0.97)} – ${fmt(f.markPrice * 0.99)}`, tone: "down" },
      { label: "High liquidity area", range: `${fmt(f.markPrice * 1.01)} – ${fmt(f.markPrice * 1.03)}`, tone: "up" },
    ],
    sample: false,
  };
}

export function getSampleLiquidityReading(): LiquidityReading {
  return {
    symbol: "BTCUSDT",
    markPrice: 67_250,
    openInterestUsd: 4_820_000_000,
    fundingRatePct: 0.012,
    fundingTone: "amber",
    liquidationZones: [
      { label: "Liquidation cluster (long)", range: "$65,200 – $66,100", tone: "down" },
      { label: "High liquidity area", range: "$68,400 – $69,600", tone: "up" },
    ],
    sample: true,
  };
}
