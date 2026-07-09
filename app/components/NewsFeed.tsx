'use client';
import { useEffect, useState } from 'react';

type NewsItem = {
  title: string;
  body: string;
  source: string;
  url: string;
  imageUrl: string;
  publishedOn: string;
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

  return (
    <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
      <h2 className="text-xs text-slate-400 uppercase tracking-wider mb-4 font-mono">
        📰 Market News
      </h2>

      {loading ? (
        <p className="text-slate-500 text-sm font-mono">Loading...</p>
      ) : news.length === 0 ? (
        <p className="text-slate-500 text-sm font-mono">No news available</p>
      ) : (
        <div className="space-y-3">
          {news.map((item, i) => (
            <div
              key={i}
              className="border-l-2 border-signal pl-3 pb-2 border-b border-slate-700"
            >
              <p className="text-sm font-mono font-semibold text-white line-clamp-2">
                {item.title}
              </p>
              <p className="text-xs text-slate-400 font-mono mt-1 line-clamp-2">
                {item.body}
              </p>
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-slate-500 font-mono">{item.source}</span>
                <span className="text-xs text-slate-600 font-mono">{item.publishedOn}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
