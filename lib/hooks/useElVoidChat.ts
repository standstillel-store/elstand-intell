"use client";
import { useState } from "react";

export interface ChatMsg {
  role: "user" | "assistant";
  text: string;
}

const GREETING =
  'Halo, saya ElVoid AI — intelijen pasar ELSTAND, berjalan dari data live. Coba tanya "analisa BTC", "whale activity", "risk tertinggi", "momentum sekarang", atau "berita terbaru".';

/**
 * One hook, two shells — components/AIChatDock.tsx (floating bubble, all
 * pages) and components/right-rail/ElVoidChatPanel.tsx (inline panel, home
 * dashboard) both call this instead of duplicating fetch/state logic.
 */
export function useElVoidChat(context: Record<string, unknown>) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([{ role: "assistant", text: GREETING }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send(overrideText?: string) {
    const text = (overrideText ?? input).trim();
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
      setMsgs((m) => [...m, { role: "assistant", text: "Request gagal — cek koneksi atau server logs." }]);
    } finally {
      setLoading(false);
    }
  }

  return { msgs, input, setInput, loading, send };
}
