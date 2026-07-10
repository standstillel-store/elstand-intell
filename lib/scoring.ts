import type {
  CoinMarket,
  DexPool,
  FundingInfo,
  WhaleTransfer,
  PumpCandidate,
  RugpullRisk,
} from "./types";

// NOTE ON WHAT THIS IS: these are transparent, rule-based heuristics over
// public data - momentum, turnover, on-chain confirmation, whale flow, and
// derivatives positioning. It is a signal aggregator, not a price oracle.
// No model (this one included) can reliably predict a 100x. Treat scores as
// "worth a closer look", never as a guarantee.

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

export function buildPumpCandidates(
  markets: CoinMarket[],
  pools: DexPool[],
  funding: FundingInfo[],
  whales: WhaleTransfer[]
): PumpCandidate[] {
  const poolsBySymbol = new Map<string, DexPool[]>();
  for (const p of pools) {
    const key = p.baseSymbol?.toLowerCase();
    if (!key) continue;
    poolsBySymbol.set(key, [...(poolsBySymbol.get(key) ?? []), p]);
  }

  const fundingBySymbol = new Map(funding.map((f) => [f.symbol.replace("USDT", "").toLowerCase(), f]));

  const whaleBySymbol = new Map<string, number>();
  for (const w of whales) {
    const k = w.asset.toLowerCase();
    whaleBySymbol.set(k, (whaleBySymbol.get(k) ?? 0) + w.valueUsd);
  }

  const candidates: PumpCandidate[] = markets
    .filter((m) => m.market_cap && m.market_cap > 0)
    .map((m) => {
      const sym = m.symbol.toLowerCase();
      const reasons: string[] = [];
      let score = 0;

      // 1) Momentum: reward acceleration, not just raw size of the move
      const chg24 = m.price_change_percentage_24h_in_currency ?? 0;
      const chg7d = m.price_change_percentage_7d_in_currency ?? 0;
      const accel = chg24 - chg7d / 7;
      if (chg24 > 8) {
        score += 15;
        reasons.push(`Price up ${chg24.toFixed(1)}% in 24h`);
      }
      if (accel > 3) {
        score += 10;
        reasons.push("Momentum accelerating vs 7d trend");
      }

      // 2) Turnover: volume relative to market cap. Unusually high turnover
      // suggests fresh attention rather than a quiet, stable holding pattern.
      const turnover = m.market_cap ? m.total_volume / m.market_cap : 0;
      if (turnover > 0.5) {
        score += 15;
        reasons.push("Volume/mcap turnover is unusually high");
      } else if (turnover > 0.2) {
        score += 7;
      }

      // 3) DEX confirmation: on-chain volume dwarfing pool liquidity
      const pool = poolsBySymbol.get(sym)?.[0];
      if (pool && pool.volume24hUsd > pool.liquidityUsd * 2) {
        score += 12;
        reasons.push("DEX volume far exceeds pool liquidity");
      }

      // 4) Smart money / whale accumulation (from the Alchemy feed)
      const whaleUsd = whaleBySymbol.get(sym) ?? 0;
      if (whaleUsd > 1_000_000) {
        score += 15;
        reasons.push("Large whale transfers detected (>$1M)");
      } else if (whaleUsd > 250_000) {
        score += 8;
        reasons.push("Whale activity detected");
      }

      // 5) Derivatives positioning: negative funding + traders paying to
      // stay short can precede squeezes; very crowded-long funding is a
      // caution flag rather than a bullish one.
      const f = fundingBySymbol.get(sym);
      if (f) {
        if (f.lastFundingRate < -0.0005) {
          score += 10;
          reasons.push("Negative funding — shorts paying longs");
        }
        if (f.lastFundingRate > 0.0015) {
          score -= 5;
          reasons.push("Funding crowded — longs paying a premium");
        }
      }

      // 6) Small-cap names have more room to move percentage-wise
      if (m.market_cap < 50_000_000) {
        score += 5;
      }

      const candidate: PumpCandidate = {
        id: m.id,
        symbol: m.symbol.toUpperCase(),
        name: m.name,
        image: m.image,
        price: m.current_price,
        change24h: chg24,
        score: clamp(score),
        reasons: reasons.slice(0, 4),
      };
      return candidate;
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  return candidates;
}

export function buildRugpullRisks(
  pools: DexPool[],
  whales: WhaleTransfer[],
  newsFlagWords: Set<string>
): RugpullRisk[] {
  const whaleBySymbol = new Map<string, number>();
  for (const w of whales) {
    const k = w.asset.toLowerCase();
    whaleBySymbol.set(k, (whaleBySymbol.get(k) ?? 0) + w.valueUsd);
  }

  const risks: RugpullRisk[] = pools
    .filter((p) => p.liquidityUsd > 0)
    .map((p) => {
      const flags: string[] = [];
      let score = 0;

      const liqToFdv = p.fdvUsd ? p.liquidityUsd / p.fdvUsd : undefined;
      if (liqToFdv !== undefined && liqToFdv < 0.02) {
        score += 25;
        flags.push("Liquidity is under 2% of fully diluted value");
      }

      const turnover = p.liquidityUsd ? p.volume24hUsd / p.liquidityUsd : 0;
      if (turnover > 5) {
        score += 20;
        flags.push("Volume is 5x+ pool liquidity — thin book, easy to manipulate");
      }

      if (p.poolCreatedAt) {
        const ageHours = (Date.now() - new Date(p.poolCreatedAt).getTime()) / 36e5;
        if (ageHours < 48 && p.volume24hUsd > 200_000) {
          score += 20;
          flags.push("Pool is under 48h old with heavy volume");
        }
      }

      if (p.liquidityUsd < 20_000) {
        score += 20;
        flags.push("Liquidity pool is very small (<$20k)");
      }

      const sym = p.baseSymbol?.toLowerCase();
      if (sym && (whaleBySymbol.get(sym) ?? 0) > 500_000) {
        score += 10;
        flags.push("Large wallet moved this token shortly before/after listing");
      }

      if (sym && newsFlagWords.has(sym)) {
        score += 15;
        flags.push("Ticker appears in recent negative news coverage");
      }

      const risk: RugpullRisk = {
        id: p.id,
        symbol: (p.baseSymbol || "?").toUpperCase(),
        name: p.name,
        network: p.network,
        score: clamp(score),
        flags,
        liquidityUsd: p.liquidityUsd,
        volume24hUsd: p.volume24hUsd,
      };
      return risk;
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  return risks;
}
