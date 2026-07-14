"use client";
import { Fragment } from "react";
import { motion } from "framer-motion";
import { Check, Minus, ShieldAlert, Clock } from "lucide-react";
import clsx from "clsx";
import { SideBadge, StatusBadge, Badge } from "@/components/ui/Badge";
import { formatUsd } from "@/lib/format";
import { useTokenAnalyzer } from "@/components/token-analyzer/TokenAnalyzerContext";
import type { AiSignal, ScanResult } from "@/lib/elvoid/types";

type DisplayStatus = "running" | "win" | "loss" | "invalidated" | "expired" | "breakeven";

function statusFor(signal: Pick<AiSignal, "status">, journalResult?: "win" | "loss" | "breakeven"): DisplayStatus {
  if (signal.status === "closed") return journalResult ?? "win";
  if (signal.status === "invalidated") return "invalidated";
  if (signal.status === "expired") return "expired";
  return "running";
}

/** Order + display label for the AI Reasoning checklist — the exact 10-item taxonomy from the product brief, each backed by a real scanner key. */
const REASONING_MAP: { key: string; label: string }[] = [
  { key: "support_resistance", label: "Support / Resistance" },
  { key: "order_block", label: "Order Block" },
  { key: "liquidity_sweep", label: "Liquidity Sweep" },
  { key: "smt_divergence", label: "SMT (Divergence)" },
  { key: "market_structure", label: "BOS / CHoCH" },
  { key: "fair_value_gap", label: "Fair Value Gap" },
  { key: "volume", label: "Volume Confirmation" },
  { key: "funding_rate", label: "Funding" },
  { key: "open_interest", label: "Open Interest" },
  { key: "whale_activity", label: "Whale Flow" },
];

function rr(entry: number, sl: number, tp: number | null | undefined): string {
  if (!tp) return "—";
  const risk = Math.abs(entry - sl) || 1e-9;
  return `${(Math.abs(tp - entry) / risk).toFixed(2)}R`;
}

export function SignalCardPro({
  signal,
  journalResult,
  onExecute,
  executing,
  compact = false,
}: {
  signal: Pick<
    AiSignal,
    "coin" | "side" | "entry" | "sl" | "tp1" | "tp2" | "tp3" | "timeframe" | "confidence" | "strategy" | "reason" | "status" | "scans" | "extra_reasoning" | "risk_percent"
  >;
  journalResult?: "win" | "loss" | "breakeven";
  onExecute?: () => void;
  executing?: boolean;
  compact?: boolean;
}) {
  const { open } = useTokenAnalyzer();
  const isLong = signal.side === "LONG";
  const winningBias = isLong ? "bullish" : "bearish";
  const status = statusFor(signal, journalResult);

  const allScans: ScanResult[] = [...(signal.scans ?? []), ...(signal.extra_reasoning ?? [])];
  const scanByKey = new Map(allScans.map((s) => [s.key, s]));

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="glow-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <SideBadge side={signal.side} />
          <button onClick={() => open(signal.coin)} className="text-left hover:text-signal-glow">
            <p className="text-sm font-bold leading-tight">{signal.coin}</p>
            <p className="text-[11px] text-ink-faint">{signal.strategy}</p>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          <Badge tone="neutral" icon={<Clock size={10} />}>
            {signal.timeframe}
          </Badge>
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[11px]">
          <span className="text-ink-faint">Confidence</span>
          <span className="mono-num font-semibold text-signal-glow">{signal.confidence}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-raised">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${signal.confidence}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="h-full rounded-full bg-signal"
          />
        </div>
      </div>

      <div className="mono-num mt-3 grid grid-cols-3 gap-2 text-xs sm:grid-cols-6">
        <div>
          <p className="text-[10px] uppercase text-ink-faint">Entry</p>
          <p>{formatUsd(signal.entry)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-ink-faint">Stop Loss</p>
          <p className="text-down">{formatUsd(signal.sl)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-ink-faint">TP1 · {rr(signal.entry, signal.sl, signal.tp1)}</p>
          <p className="text-up">{formatUsd(signal.tp1)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-ink-faint">TP2 · {rr(signal.entry, signal.sl, signal.tp2)}</p>
          <p className="text-up">{formatUsd(signal.tp2)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-ink-faint">TP3 · {rr(signal.entry, signal.sl, signal.tp3)}</p>
          <p className="text-up">{signal.tp3 ? formatUsd(signal.tp3) : "—"}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-ink-faint">Risk/Trade</p>
          <p className="flex items-center gap-1">
            <ShieldAlert size={11} className="text-ink-faint" /> {signal.risk_percent}%
          </p>
        </div>
      </div>

      {!compact && (
        <div className="mt-4 border-t border-line pt-3">
          <p className="eyebrow mb-2 text-[10px] uppercase tracking-wider text-ink-faint">AI Reasoning</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-2">
            {REASONING_MAP.map(({ key, label }) => {
              const scan = scanByKey.get(key);
              const fired = Boolean(scan && scan.bias === winningBias && scan.weight > 0);
              return (
                <Fragment key={key}>
                  <div
                    className={clsx("flex items-start gap-1.5 rounded-md px-1.5 py-1 text-[11px]", fired ? "text-ink" : "text-ink-faint/70")}
                    title={scan?.detail ?? "Belum ada data untuk kategori ini."}
                  >
                    {fired ? (
                      <Check size={13} className={clsx("mt-0.5 shrink-0", isLong ? "text-up" : "text-down")} />
                    ) : (
                      <Minus size={13} className="mt-0.5 shrink-0 text-ink-faint/50" />
                    )}
                    <span>{label}</span>
                  </div>
                </Fragment>
              );
            })}
          </div>
        </div>
      )}

      <p className="mt-3 text-[12px] leading-relaxed text-ink-muted">{signal.reason}</p>

      {onExecute && signal.status === "new" && (
        <button
          onClick={onExecute}
          disabled={executing}
          className="mt-3 w-full rounded-md bg-signal py-2 text-xs font-medium text-white transition-colors hover:bg-signal-glow disabled:opacity-50"
        >
          {executing ? "Membuka posisi…" : "Execute Paper Trade"}
        </button>
      )}
    </motion.div>
  );
}
