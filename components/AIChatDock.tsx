"use client";
import { useState } from "react";
import { Sparkles, X, Send } from "lucide-react";

interface Msg {
  role: "user" | "assistant";
  text: string;
}

export function AIChatDock({ context }: { context: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "assistant",
      text: 'Halo! Aku Nocturn AI — gratis, jalan dari data live. Coba tanya "analisa ALLO", "whale activity", "risk tertinggi", "momentum sekarang", atau "berita terbaru".',
    },
  ]);
  const [loading, setLoading] = useState(false);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setMsgs((m) => [...m, { role: "user", text }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, context }),
      });
      const data = await res.json();
      setMsgs((m) => [...m, { role: "assistant", text: data.reply ?? "No response." }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", text: "Request failed — check the server logs." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 sm:bottom-6 sm:right-6">
      {open ? (
        <div className="flex h-[32rem] w-[24rem] max-w-[90vw] flex-col rounded-xl border border-line bg-bg-raised shadow-2xl shadow-black/50">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <Sparkles size={14} className="text-signal-glow" /> Noctrun AI
            </span>
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="text-ink-muted hover:text-ink">
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                  m.role === "user" ? "ml-auto bg-signal/20 text-ink" : "bg-bg-surface text-ink"
                }`}
              >
                {m.text}
              </div>
            ))}
            {loading && <div className="text-xs text-ink-muted">Thinking…</div>}
          </div>
          <div className="flex items-center gap-2 border-t border-line p-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask about the market…"
              className="flex-1 rounded-md border border-line bg-bg px-2.5 py-1.5 text-sm outline-none focus:border-signal"
            />
            <button
              onClick={send}
              aria-label="Send"
              disabled={loading}
              className="rounded-md bg-signal p-1.5 text-white hover:bg-signal-glow disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full border border-signal/40 bg-bg-raised px-4 py-2.5 text-sm font-medium shadow-lg shadow-signal/10 hover:border-signal"
        >
          <Sparkles size={16} className="text-signal-glow" /> Ask Noctrun AI
        </button>
      )}
    </div>
  );
}
