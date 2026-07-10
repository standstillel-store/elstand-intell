'use client';
import { useEffect, useState } from 'react';

export default function MarketTicker() {
  const [coins, setCoins] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/market')
      .then((res) => res.json())
      .then((data) => setCoins(data.coins || []))
      .catch(() => setCoins([]));
  }, []);

  return (
    <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
      <h2 className="text-xs text-slate-400 uppercase mb-4 font-mono">Market Heatmap</h2>
      <div className="space-y-2">
        {coins.slice(0, 8).map((c) => (
          <div key={c.symbol} className="flex justify-between text-sm font-mono">
            <span>{c.symbol}</span>
            <span className={c.change24h >= 0 ? 'text-green-400' : 'text-red-400'}>
              ${c.price.toLocaleString()} {c.change24h >= 0 ? '▲' : '▼'} {Math.abs(c.change24h).toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
