import { Waves } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SectionHeader } from "@/components/SectionHeader";
import { formatUsd, timeAgo, shortAddr } from "@/lib/format";
import { getWhaleTransfers } from "@/lib/alchemy";
import { getTopMarkets } from "@/lib/coingecko";

export const metadata = {
  title: "Whale Activity | Nocturn",
};

export default async function WhalePage() {
  const markets = await getTopMarkets(150).catch(() => []);
  const priceBySymbol: Record<string, number> = {};
  for (const m of markets) priceBySymbol[m.symbol.toLowerCase()] = m.current_price;
  const transfers = await getWhaleTransfers(priceBySymbol).catch(() => []);

  const byAsset = new Map<string, { count: number; total: number }>();
  for (const t of transfers) {
    const prev = byAsset.get(t.asset) ?? { count: 0, total: 0 };
    byAsset.set(t.asset, { count: prev.count + 1, total: prev.total + t.valueUsd });
  }
  const assetSummary = [...byAsset.entries()].map(([asset, v]) => ({ asset, ...v })).sort((a, b) => b.total - a.total);

  return (
    <AppShell title="Whale Activity" subtitle="Transfer on-chain besar terbaru — feed langsung dari Alchemy.">
      {!transfers.length && (
        <div className="panel p-6 text-center text-sm text-ink-muted">
          Tidak ada transfer whale besar terdeteksi saat ini, atau ALCHEMY_API_KEY belum diset. Lihat Settings untuk status
          integrasi.
        </div>
      )}

      {transfers.length > 0 && (
        <>
          <div className="panel p-4">
            <SectionHeader code="AST" title="By Asset" hint={`${assetSummary.length} aset`} />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {assetSummary.slice(0, 12).map((a) => (
                <div key={a.asset} className="rounded-md border border-line p-3">
                  <p className="mono-num text-sm font-semibold text-signal-glow">{a.asset}</p>
                  <p className="mono-num mt-1 text-xs text-ink">{formatUsd(a.total)}</p>
                  <p className="mt-0.5 text-[11px] text-ink-faint">{a.count} transfer</p>
                </div>
              ))}
            </div>
          </div>

          <div className="panel p-4">
            <SectionHeader code="SMN" title="Recent Transfers" hint={`${transfers.length} transfer terdeteksi`} />
            <ul className="divide-y divide-line">
              {transfers.slice(0, 40).map((w) => (
                <li key={w.hash} className="flex items-center gap-3 py-2.5 text-sm">
                  <Waves size={13} className="shrink-0 text-ink-faint" />
                  <span className="mono-num w-16 shrink-0 font-medium text-signal-glow">{w.asset}</span>
                  <span className="min-w-0 flex-1 truncate text-xs text-ink-muted">
                    {shortAddr(w.from)} → {shortAddr(w.to)}
                  </span>
                  <span className="mono-num shrink-0 text-right">{formatUsd(w.valueUsd)}</span>
                  <span className="w-14 shrink-0 text-right text-[11px] text-ink-faint">{timeAgo(w.timestamp)}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </AppShell>
  );
}
