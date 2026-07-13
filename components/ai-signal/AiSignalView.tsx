"use client";
import { useCallback, useEffect, useState } from "react";
import { Search, Radar, Loader2 } from "lucide-react";
import clsx from "clsx";
import { SignalCard } from "./SignalCard";
import { Disclaimer } from "@/components/Disclaimer";
import type { AiSignal } from "@/lib/elvoid/types";

type Filter = "all" | "long" | "short" | "high";

export function AiSignalView() {
  const [signals, setSignals] = useState<AiSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [coinQuery, setCoinQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/ai-signals?limit=60").then((r) => r.json());
      setSignals(res.signals ?? []);
    } catch {
      // Keep whatever signals are already on screen; don't wipe the list on a transient fetch failure.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleScan() {
    setScanning(true);
    setError(null);
    try {
      const raw = await fetch("/api/ai-signals/scan", { method: "POST" });
      if (!raw.ok) {
        setError(`Scan gagal (HTTP ${raw.status}) — server tidak merespons dengan benar. Coba lagi sebentar.`);
        return;
      }
      const res = await raw.json();
      if (res.error) {
        setError(res.error);
      } else if (Array.isArray(res.signals) && res.signals.length === 0) {
        setError(
          "Scan selesai tapi 0 sinyal ditemukan. Biasanya ini berarti data candle Binance tidak bisa diakses dari server (Binance memblokir IP asal Amerika Serikat) — pastikan Vercel Function region di-set ke luar AS (mis. sin1), lalu redeploy."
        );
      }
      await load();
    } catch {
      setError("Scan gagal — koneksi ke server terputus atau timeout. Coba lagi sebentar.");
    } finally {
      setScanning(false);
    }
  }

  async function handleAnalyze() {
    const coin = coinQuery.trim();
    if (!coin) return;
    setAnalyzing(true);
    setError(null);
    try {
      const raw = await fetch("/api/ai-signals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coin }),
      });
      if (!raw.ok && raw.status >= 500) {
        setError(`Analyze gagal (HTTP ${raw.status}) — server tidak merespons dengan benar. Coba lagi sebentar.`);
        return;
      }
      const res = await raw.json();
      if (res.error) setError(res.error);
      else await load();
    } catch {
      setError("Analyze gagal — koneksi ke server terputus atau timeout. Coba lagi sebentar.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleExecute(signal: AiSignal) {
    setExecutingId(signal.id);
    try {
      await fetch("/api/paper-trader/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signalId: signal.id }),
      });
      await load();
    } finally {
      setExecutingId(null);
    }
  }

  const filtered = signals.filter((s) => {
    if (filter === "long") return s.side === "LONG";
    if (filter === "short") return s.side === "SHORT";
    if (filter === "high") return s.confidence >= 65;
    return true;
  });

  return (
    <div className="space-y-5">
      <Disclaimer />

      <div className="panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-md border border-line bg-bg px-3 py-2">
          <Search size={14} className="text-ink-faint" />
          <input
            value={coinQuery}
            onChange={(e) => setCoinQuery(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            placeholder="Analisa coin, mis. BTC"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-ink-faint"
          />
          <button
            onClick={handleAnalyze}
            disabled={analyzing || !coinQuery.trim()}
            className="shrink-0 rounded-md bg-signal px-3 py-1.5 text-xs font-medium text-white hover:bg-signal-glow disabled:opacity-50"
          >
            {analyzing ? "Menganalisa…" : "Analyze"}
          </button>
        </div>
        <button
          onClick={handleScan}
          disabled={scanning}
          className="flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-signal/40 px-3.5 py-2 text-xs font-medium text-signal-glow hover:border-signal disabled:opacity-50"
        >
          {scanning ? <Loader2 size={14} className="animate-spin" /> : <Radar size={14} />}
          {scanning ? "Scanning market…" : "Scan Market"}
        </button>
      </div>

      {error && <p className="text-sm text-down">{error}</p>}

      <div className="flex gap-2">
        {(["all", "long", "short", "high"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              "rounded-full border px-3 py-1 text-xs capitalize",
              filter === f ? "border-signal bg-signal/10 text-ink" : "border-line text-ink-muted hover:text-ink"
            )}
          >
            {f === "high" ? "High Confidence" : f}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-ink-muted">Memuat sinyal…</p>
      ) : filtered.length ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => (
            <SignalCard key={s.id} signal={s} onExecute={handleExecute} executing={executingId === s.id} />
          ))}
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-ink-muted">
          Belum ada sinyal. Klik <strong className="text-ink">Scan Market</strong> atau analisa coin tertentu di atas.
        </p>
      )}
    </div>
  );
}
