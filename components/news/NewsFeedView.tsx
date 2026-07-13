"use client";
import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { timeAgo } from "@/lib/format";
import type { NewsItem } from "@/lib/types";

const SENTIMENT_STYLE: Record<string, string> = {
  positive: "bg-up/15 text-up border-up/30",
  negative: "bg-down/15 text-down border-down/30",
  neutral: "bg-ink-faint/10 text-ink-muted border-line",
};

export function NewsFeedView({ news }: { news: NewsItem[] }) {
  const [filter, setFilter] = useState<"all" | "positive" | "negative" | "neutral">("all");
  const filtered = filter === "all" ? news : news.filter((n) => (n.sentiment ?? "neutral") === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "positive", "negative", "neutral"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-xs capitalize ${
              filter === f ? "border-signal bg-signal/10 text-ink" : "border-line text-ink-muted hover:text-ink"
            }`}
          >
            {f}
          </button>
        ))}
        <span className="ml-auto text-xs text-ink-faint">{filtered.length} berita</span>
      </div>

      {!filtered.length && <div className="panel p-6 text-center text-sm text-ink-muted">Tidak ada berita untuk filter ini.</div>}

      <div className="panel divide-y divide-line p-0">
        {filtered.map((n) => (
          <a
            key={n.id}
            href={n.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 px-4 py-3 hover:bg-bg-raised/40"
          >
            <span
              className={`mt-0.5 shrink-0 rounded border px-1.5 py-0.5 text-[9px] uppercase tracking-wide ${SENTIMENT_STYLE[n.sentiment ?? "neutral"]}`}
            >
              {n.sentiment ?? "neutral"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink">{n.title}</p>
              <p className="mt-0.5 text-[11px] text-ink-faint">
                {n.source} · {timeAgo(n.publishedAt)}
              </p>
            </div>
            <ExternalLink size={13} className="mt-0.5 shrink-0 text-ink-faint" />
          </a>
        ))}
      </div>
    </div>
  );
}
