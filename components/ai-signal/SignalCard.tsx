"use client";
import { ArrowUpRight, ArrowDownRight, ShieldAlert } from "lucide-react";
import { ConfidenceMeter } from "@/components/ConfidenceMeter";
import { formatUsd } from "@/lib/format";
import type { AiSignal } from "@/lib/elvoid/types";

export function SignalCard({
  signal,
  onExecute,
  executing,
}: {
  signal: AiSignal;
  onExecute?: (signal: AiSignal) => void;
  executing?: boolean;
}) {
  const isLong = signal.side === "LONG";

  return (
    <div className="panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold ${
              isLong ? "border-up/30 bg-up/15 text-up" : "border-down/30 bg-down/15 text-down"
            }`}
          >
            {isLong ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {signal.side}
          </span>
          <div>
            <p className="text-sm font-semibold">{signal.coin}</p>
            <p className="text-[11px] text-ink-faint">{signal.strategy}</p>
          </div>
        </div>
        <ConfidenceMeter value={signal.confidence} />
      </div>

      <div className="mono-num mt-3 grid grid-cols-2 gap-2.5 text-xs sm:grid-cols-4">
        <div>
          <p className="text-[10px] uppercase text-ink-faint">Entry</p>
          <p>{formatUsd(signal.entry)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-ink-faint">Stop Loss</p>
          <p className="text-down">{formatUsd(signal.sl)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-ink-faint">TP1</p>
          <p className="text-up">{formatUsd(signal.tp1)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-ink-faint">TP2</p>
          <p className="text-up">{formatUsd(signal.tp2)}</p>
        </div>
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-faint">
        <ShieldAlert size={12} /> Risk {signal.risk_percent}% per trade
      </p>
      <p className="mt-2 text-xs leading-relaxed text-ink-muted">{signal.reason}</p>

      {onExecute && signal.status === "new" && (
        <button
          onClick={() => onExecute(signal)}
          disabled={executing}
          className="mt-3 w-full rounded-md bg-signal py-2 text-xs font-medium text-white hover:bg-signal-glow disabled:opacity-50"
        >
          {executing ? "Membuka posisi…" : "Execute Paper Trade"}
        </button>
      )}
      {signal.status !== "new" && (
        <p className="mt-3 text-center text-[11px] uppercase tracking-wide text-ink-faint">
          Status: {signal.status.replace("_", " ")}
        </p>
      )}
    </div>
  );
}
