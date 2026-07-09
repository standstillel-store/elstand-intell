'use client';
import { useEffect, useState } from 'react';

type Whale = {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: string;
};

export default function WhaleTracker() {
  const [whales, setWhales] = useState<Whale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/whales')
      .then((res) => res.json())
      .then((data) => {
        setWhales(data.transactions || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const shortAddr = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;
  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return `${Math.floor(diff / 60000)}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 md:col-span-2">
      <h2 className="text-xs text-slate-400 uppercase mb-4 font-mono">🐳 Whale Tracker (Etherscan)</h2>
      
      {loading && <p className="text-slate-500 text-sm font-mono">Loading...</p>}
      {!loading && whales.length === 0 && <p className="text-slate-500 text-sm">No whales found</p>}
      
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {whales.map((w) => (
          <div key={w.hash} className="border border-slate-600 rounded p-3 bg-slate-700/50">
            <div className="flex justify-between mb-2">
              <div>
                <p className="text-xs text-green-400 font-mono">ETH Transfer</p>
                <p className="text-slate-400 text-xs font-mono mt-1">{shortAddr(w.from)} → {shortAddr(w.to)}</p>
              </div>
              <div className="text-right">
                <p className="font-bold font-mono">{w.value} ETH</p>
                <p className="text-green-400 text-xs font-mono">${(parseFloat(w.value) * 42000).toLocaleString()}</p>
              </div>
            </div>
            <div className="flex justify-between text-xs">
              <a
                href={`https://etherscan.io/tx/${w.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline font-mono"
              >
                View
              </a>
              <span className="text-slate-500 font-mono">{timeAgo(w.timestamp)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
