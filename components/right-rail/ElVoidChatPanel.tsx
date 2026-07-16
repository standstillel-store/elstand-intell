"use client";
import { Send, Loader2 } from "lucide-react";
import { LineChart } from "lucide-react";
import Link from "next/link";
import { useRef, useEffect } from "react";
import { useElVoidChat } from "@/lib/hooks/useElVoidChat";
import { SectionHeader } from "@/components/SectionHeader";

const QUICK_PROMPTS = ["Analisa BTC", "Whale activity", "Risk tertinggi", "Momentum sekarang"];

export function ElVoidChatPanel({ context }: { context: Record<string, unknown> }) {
  const { msgs, input, setInput, loading, send } = useElVoidChat(context);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, loading]);

  return (
    <div className="glow-card flex h-[420px] flex-col p-4">
      <SectionHeader code="AI" title="ElVoid AI Chat" hint="Live" />
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto pr-1">
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`max-w-[92%] animate-fadeUp whitespace-pre-wrap rounded-lg px-3 py-2 text-[13px] leading-relaxed ${
              m.role === "user" ? "ml-auto bg-signal/20 text-ink" : "bg-bg-raised text-ink"
            }`}
          >
            {m.text}
            {m.action?.type === "open_chart" && (
              <Link
                href={`/ai-signal?tab=chart&symbol=${m.action.symbol}`}
                className="mt-2 flex items-center gap-1.5 rounded-md border border-signal/40 px-2.5 py-1.5 text-[11px] font-medium text-signal-glow hover:border-signal"
              >
                <LineChart size={12} /> Buka Chart {m.action.symbol}
              </Link>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-1.5 text-xs text-ink-muted">
            <Loader2 size={12} className="animate-spin" /> ElVoid AI berpikir…
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {QUICK_PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => send(p)}
            disabled={loading}
            className="rounded-full border border-line px-2.5 py-1 text-[11px] text-ink-muted transition-colors hover:border-signal/40 hover:text-ink disabled:opacity-50"
          >
            {p}
          </button>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-2 border-t border-line pt-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Tanya ElVoid AI…"
          className="flex-1 rounded-md border border-line bg-bg px-2.5 py-1.5 text-sm outline-none focus:border-signal"
        />
        <button
          onClick={() => send()}
          disabled={loading}
          aria-label="Send"
          className="rounded-md bg-signal p-1.5 text-white transition-colors hover:bg-signal-glow disabled:opacity-50"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
