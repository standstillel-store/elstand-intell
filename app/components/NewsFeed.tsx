'use client';
import { useEffect, useState } from 'react';

type NewsItem = {
  title: string;
  source: string;
  url: string;
  image: string;
  publishedAt: string;
  description: string;
};

export default function NewsFeed() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/news')
      .then((res) => res.json())
      .then((data) => {
        setNews(data.news || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return `${Math.floor(diff / 60000)}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 md:col-span-1">
      <h2 className="text-xs text-slate-400 uppercase mb-4 font-mono">📰 Market News</h2>

      {loading && <p className="text-slate-500 text-sm font-mono">Loading news...</p>}

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {news.map((item, i) => (
          <a
            key={i}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block border border-slate-600 rounded p-3 bg-slate-700/50 hover:bg-slate-700 transition"
          >
            <p className="text-xs text-slate-400 font-mono mb-1">{item.source.toUpperCase()}</p>
            <p className="text-sm font-semibold text-slate-100 line-clamp-2 mb-2">{item.title}</p>
            <p className="text-xs text-slate-500 line-clamp-2 mb-2">{item.description}</p>
            <p className="text-xs text-slate-500 font-mono">{timeAgo(item.publishedAt)}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
