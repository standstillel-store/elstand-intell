import { SectionHeader } from "@/components/SectionHeader";
import { timeAgo } from "@/lib/format";
import type { JournalWithSignal } from "@/lib/elvoid/types";

const RESULT_STYLE: Record<string, string> = {
  win: "bg-up/15 text-up border-up/30",
  loss: "bg-down/15 text-down border-down/30",
  breakeven: "bg-ink-faint/10 text-ink-muted border-line",
};

export function ClosedTradesTable({ entries }: { entries: JournalWithSignal[] }) {
  return (
    <div className="panel p-4">
      <SectionHeader code="CLS" title="Recent Trades" hint={`${entries.length} trade ditutup`} />
      {!entries.length && <p className="py-6 text-center text-sm text-ink-muted">Belum ada trade yang ditutup.</p>}
      {entries.length > 0 && (
        <ul className="divide-y divide-line">
          {entries.slice(0, 12).map((e) => (
            <li key={e.id} className="flex items-center gap-3 py-2.5 text-sm">
              <span
                className={`mono-num inline-flex h-6 w-16 shrink-0 items-center justify-center rounded-md border text-[10px] font-medium uppercase ${RESULT_STYLE[e.result]}`}
              >
                {e.result}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{e.signal?.coin ?? "?"}</span>
                  {e.signal && (
                    <span className={`mono-num text-[11px] ${e.signal.side === "LONG" ? "text-up" : "text-down"}`}>{e.signal.side}</span>
                  )}
                  <span className="truncate text-[11px] text-ink-faint">{e.signal?.strategy}</span>
                </div>
              </div>
              <div className="mono-num shrink-0 text-right text-xs">
                <div className={e.profit_percent >= 0 ? "text-up" : "text-down"}>
                  {e.profit_percent >= 0 ? "+" : ""}
                  {e.profit_percent.toFixed(2)}%
                </div>
                <div className="text-ink-faint">{e.rr.toFixed(2)}R</div>
              </div>
              <span className="w-14 shrink-0 text-right text-[11px] text-ink-faint">{timeAgo(e.closed_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
