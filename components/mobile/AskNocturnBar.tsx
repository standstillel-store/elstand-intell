"use client";
import { useState } from "react";
import { Sparkles, Send, X, Loader2 } from "lucide-react";

const SUGGESTIONS = ["ringkasan market", "whale activity", "risk tertinggi"];

export function AskNocturnBar() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState<string | null>(null);

  async function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setReply(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json();
      setReply(data.reply ?? "Tidak ada jawaban.");
    } catch {
      setReply("Request gagal — coba lagi sebentar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-4 pb-3">
      <div className="flex items-center gap-2 rounded-full border border-line bg-bg-surface px-3.5 py-2.5">
        <Sparkles size={15} className="shrink-0 text-signal-glow" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask(input)}
          placeholder="Ask ElVoid..."
          className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
        />
        <button
          onClick={() => ask(input)}
          disabled={loading}
          aria-label="Kirim"
          className="shrink-0 text-ink-muted hover:text-signal-glow disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>

      {!reply && !loading && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => {
                setInput(s);
                ask(s);
              }}
              className="rounded-full border border-line px-2.5 py-1 text-[11px] text-ink-muted hover:border-signal hover:text-ink"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {reply && (
        <div className="mt-2 rounded-lg border border-line bg-bg-raised p-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="eyebrow flex items-center gap-1.5 text-[10px] text-signal-glow">
              <Sparkles size={11} /> ELVOID AI
            </span>
            <button onClick={() => setReply(null)} aria-label="Tutup" className="text-ink-muted hover:text-ink">
              <X size={14} />
            </button>
          </div>
          <p className="whitespace-pre-wrap text-sm text-ink">{reply}</p>
        </div>
      )}
    </div>
  );
}
