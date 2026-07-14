import { AppShell } from "@/components/AppShell";
import { NewsFeedView } from "@/components/news/NewsFeedView";
import { getNews } from "@/lib/newsapi";

export const metadata = {
  title: "News | ELSTAND INTELLIGENCE",
};

export default async function NewsPage() {
  const news = await getNews().catch(() => []);
  return (
    <AppShell title="News" subtitle="Feed berita crypto dengan tag sentimen — dipakai ElVoid AI untuk News Sentiment scan.">
      {!news.length ? (
        <div className="glow-card p-6 text-center text-sm text-ink-muted">
          Feed berita belum aktif — NEWSAPI_KEY belum diset. Lihat Settings untuk status integrasi.
        </div>
      ) : (
        <NewsFeedView news={news} />
      )}
    </AppShell>
  );
}
