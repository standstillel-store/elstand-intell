import { cached } from "./cache";
import type { NewsItem } from "./types";

// NewsAPI.org — free tier: 100 req/day, headlines only (no full article).
// Daftar gratis di https://newsapi.org/register
// Catatan: free tier hanya boleh dipakai di localhost. Untuk production/Vercel
// kamu perlu upgrade ke Developer plan ($449/bln) atau pakai proxy server.
// Alternatif gratis untuk production: https://gnews.io (free 100 req/day, no localhost restriction)

export async function getNews(): Promise<NewsItem[]> {
  const key = process.env.NEWSAPI_KEY;
  if (!key) return [];

  return cached("newsapi:crypto", 120_000, async () => {
    try {
      const res = await fetch(
        `https://newsapi.org/v2/everything?q=crypto+bitcoin+altcoin&language=en&sortBy=publishedAt&pageSize=30&apiKey=${key}`,
        { next: { revalidate: 120 } }
      );
      if (!res.ok) return [];
      const json = await res.json();
      if (json.status !== "ok") return [];

      const articles = (json.articles ?? []) as Array<{
        title: string;
        url: string;
        publishedAt: string;
        source?: { name?: string };
        description?: string;
      }>;

      return articles.map((a, i) => ({
        id: i,
        title: a.title,
        url: a.url,
        source: a.source?.name ?? "NewsAPI",
        publishedAt: a.publishedAt,
        sentiment: /rug|scam|hack|exploit|crash|ban|fraud|ponzi/i.test(a.title + " " + (a.description ?? ""))
          ? ("negative" as const)
          : /surge|pump|moon|rally|breakout|bullish|ath/i.test(a.title)
          ? ("positive" as const)
          : ("neutral" as const),
      }));
    } catch {
      return [];
    }
  });
}
