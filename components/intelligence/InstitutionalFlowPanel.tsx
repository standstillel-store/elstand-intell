import clsx from "clsx";
import { Landmark, TrendingUp, Activity } from "lucide-react";
import { SectionHeader } from "@/components/SectionHeader";
import { formatUsd } from "@/lib/format";
import type { SmartMoneyEntry } from "@/lib/scanner-categories";
import { getSampleInstitutionalFlow, getSampleSmartMoneyEntries } from "@/lib/intelligence/institutionalFlow";

function FlowBar({ label, valueUsd, maxAbs }: { label: string; valueUsd: number; maxAbs: number }) {
  const pct = maxAbs > 0 ? Math.min(100, (Math.abs(valueUsd) / maxAbs) * 100) : 0;
  const positive = valueUsd >= 0;
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-14 shrink-0 font-medium text-ink-muted">{label}</span>
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-line">
        <div
          className={clsx("absolute inset-y-0", positive ? "left-1/2 bg-up" : "right-1/2 bg-down")}
          style={{ width: `${pct / 2}%` }}
        />
        <div className="absolute inset-y-0 left-1/2 w-px bg-ink-faint/40" />
      </div>
      <span className={clsx("mono-num w-20 shrink-0 text-right", positive ? "text-up" : "text-down")}>
        {positive ? "+" : ""}
        {formatUsd(valueUsd)}
      </span>
    </div>
  );
}

export function InstitutionalFlowPanel({ smartMoney }: { smartMoney?: SmartMoneyEntry[] }) {
  const { etfFlows, etfNetTotalUsd, movements } = getSampleInstitutionalFlow();
  const smartMoneyRows = smartMoney?.length ? smartMoney : getSampleSmartMoneyEntries();
  const maxAbs = Math.max(...etfFlows.map((f) => Math.abs(f.netFlowUsd)), 1);
  const usingSampleSmartMoney = !smartMoney?.length;

  return (
    <div className="glow-card p-4">
      <SectionHeader
        code="INF"
        title="Institutional Flow"
        hint={`Net ETF ${etfNetTotalUsd >= 0 ? "+" : ""}${formatUsd(etfNetTotalUsd)}`}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-ink-faint">
            <Landmark size={13} />
            <span className="eyebrow text-[10px] uppercase tracking-wider">ETF Flow</span>
            <span className="ml-auto shrink-0 rounded border border-line px-1 text-[9px] uppercase text-ink-faint">contoh</span>
          </div>
          <div className="space-y-2">
            {etfFlows.map((f) => (
              <FlowBar key={f.ticker} label={f.ticker} valueUsd={f.netFlowUsd} maxAbs={maxAbs} />
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-1.5 text-ink-faint">
            <TrendingUp size={13} />
            <span className="eyebrow text-[10px] uppercase tracking-wider">Smart Money Activity</span>
            {usingSampleSmartMoney && (
              <span className="ml-auto shrink-0 rounded border border-line px-1 text-[9px] uppercase text-ink-faint">contoh</span>
            )}
          </div>
          <ul className="divide-y divide-line">
            {smartMoneyRows.slice(0, 5).map((s) => (
              <li key={s.symbol} className="flex items-center gap-3 py-2 text-xs">
                <span className="mono-num w-14 shrink-0 font-medium text-smartmoney-glow">{s.symbol}</span>
                <span className="min-w-0 flex-1 truncate text-ink-faint">{s.txCount} transaksi besar</span>
                <span className="mono-num shrink-0 text-up">+{formatUsd(s.netInflowUsd)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-1.5 text-ink-faint">
            <Activity size={13} />
            <span className="eyebrow text-[10px] uppercase tracking-wider">Institutional Movement</span>
            <span className="ml-auto shrink-0 rounded border border-line px-1 text-[9px] uppercase text-ink-faint">contoh</span>
          </div>
          <ul className="space-y-2.5">
            {movements.map((m) => (
              <li key={m.label} className="flex items-start gap-2 text-xs">
                <span
                  className={clsx(
                    "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                    m.tone === "up" ? "bg-up" : m.tone === "down" ? "bg-down" : "bg-ink-faint"
                  )}
                />
                <div className="min-w-0">
                  <p className="text-ink">{m.label}</p>
                  <p className="mt-0.5 text-[11px] text-ink-faint">{m.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-4 text-[10px] leading-relaxed text-ink-faint">
        ETF Flow &amp; Institutional Movement memakai data contoh — belum ada sumber gratis tanpa API key untuk data ini di
        codebase. Smart Money Activity akan otomatis memakai data live begitu terhubung ke buildSmartMoneyAccumulation().
      </p>
    </div>
  );
}
