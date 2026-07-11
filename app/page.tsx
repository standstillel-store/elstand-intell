import { getTopMarkets, getGlobal } from "@/lib/coingecko";
import { getTrendingPools, getNewPools } from "@/lib/geckoterminal";
import { getFundingSnapshot } from "@/lib/binance";
import { getWhaleTransfers } from "@/lib/alchemy";
import { getFearGreed } from "@/lib/alternativeme";
import { getNews } from "@/lib/newsapi";
import { buildPumpCandidates, buildRugpullRisks } from "@/lib/scoring";
import { TopBar } from "@/components/TopBar";
import { PulseTicker } from "@/components/PulseTicker";
import { PumpCandidatesPanel } from "@/components/PumpCandidatesPanel";
import { RugpullRiskPanel } from "@/components/RugpullRiskPanel";
import { SmartMoneyPanel } from "@/components/SmartMoneyPanel";
import { FearGreedGauge } from "@/components/FearGreedGauge";
import { AIChatDock } from "@/components/AIChatDock";
import { formatUsd } from "@/lib/format";

export const revalidate = 60;

export default async function Home() {
  const [markets, global, trending, fresh, funding, fng, news] = await Promise.all([
    getTopMarkets(150).catch(() => []),
    getGlobal().catch(() => undefined),
    getTrendingPools().catch(() => []),
    getNewPools().catch(() => []),
    getFundingSnapshot().catch(() => []),
    getFearGreed().catch(() => undefined),
    getNews().catch(() => []),
  ]);

  const priceBySymbol: Record<string, number> = {};
  for (const m of markets) priceBySymbol[m.symbol.toLowerCase()] = m.current_price;
  const whales = await getWhaleTransfers(priceBySymbol).catch(() => []);

  const pools = [...trending, ...fresh];
  const pumpCandidates = buildPumpCandidates(markets, pools, funding, whales);

  const negativeTitles = news.filter((n) => n.sentiment === "negative" || /rug|scam|exploit|hack/i.test(n.title));
  const newsFlagWords = new Set<string>();
  for (const n of negativeTitles) {
    for (const w of n.title.toLowerCase().match(/[a-z0-9]+/g) ?? []) newsFlagWords.add(w);
  }
  const rugpullRisks = buildRugpullRisks(pools, whales, newsFlagWords);

  const tickerItems = [
    ...pumpCandidates.slice(0, 5).map((c) => `${c.symbol} PUMP-SCORE ${c.score}`),
    ...rugpullRisks.slice(0, 5).map((r) => `${r.symbol} RUG-RISK ${r.score}`),
    fng ? `FEAR&GREED ${fng.now.value} (${fng.now.classification})` : "",
  ].filter(Boolean);

  const chatContext = {
    topPump: pumpCandidates.slice(0, 5),
    topRisk: rugpullRisks.slice(0, 5),
    fearGreed: fng?.now,
    btcPrice: markets.find((m) => m.symbol === "btc")?.current_price,
  };

  return (
    <main className="min-h-screen pb-24">
      <TopBar
        btcPrice={markets.find((m) => m.symbol === "btc")?.current_price}
        mcap={global?.total_market_cap?.usd}
        fng={fng?.now.value}
      />
      <PulseTicker items={tickerItems} />

      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 rounded-lg border border-amber/30 bg-amber/5 px-4 py-3 text-xs text-amber">
          Noctrun surfaces data-driven signals from public market data. It cannot predict future prices. Nothing
          here is financial advice — always verify independently before trading.
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <PumpCandidatesPanel items={pumpCandidates} />
            <RugpullRiskPanel items={rugpullRisks} />
          </div>
          <div className="space-y-5">
            <FearGreedGauge
              value={fng?.now.value ?? 50}
              classification={fng?.now.classification ?? "Unknown"}
              prevValue={fng?.yesterday?.value}
            />
            <SmartMoneyPanel items={whales} />
          </div>
        </div>

        {global && (
          <p className="mono-num mt-6 text-center text-xs text-ink-faint">
            Total market cap {formatUsd(global.total_market_cap.usd)} · BTC dominance{" "}
            {global.market_cap_percentage.btc.toFixed(1)}%
          </p>
        )}
      </div>

      <AIChatDock context={chatContext} />
    </main>
  );
}
