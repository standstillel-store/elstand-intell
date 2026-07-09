'use client';
import { useEffect, useState } from 'react';

type Coin = {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
};

export default function MarketTicker() {
  const [coins, setCoins] = useState<Coin[]>([]);

  useEffect(() => {
    fetch('/api/market')
      .then((res) => res.json())
      .then((data) => setCoins(data.coins || []))
      .catch(() => setCoins([]));
  }, []);

  return (
    <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
      <h2 className="text-xs text-slate-400 uppercase tracking-wider mb-4 font-mono">
        Market Ticker
      </h2>

      <div className="space-y-2">
        {coins.length === 0 && (
          <p className="text-slate-500 text-sm font-mono">Loading...</p>
        )}
        {coins.slice(0, 8).map((c) => (
          <div key={c.symbol} className="flex justify-between items-center text-sm">
            <span className="font-mono font-semibold">{c.symbol}</span>
            <span className="font-mono">
              ${c.price.toLocaleString()}{' '}
              <span className={c.change24h >= 0 ? 'text-signal' : 'text-danger'}>
                {c.change24h >= 0 ? '▲' : '▼'} {Math.abs(c.change24h).toFixed(2)}%
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
