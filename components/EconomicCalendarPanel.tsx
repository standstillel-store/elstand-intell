import { SectionHeader } from "./SectionHeader";
import { timeUntil } from "@/lib/format";
import type { EconomicEvent } from "@/lib/types";

export function EconomicCalendarPanel({ items }: { items: EconomicEvent[] }) {
  const upcoming = items.filter((e) => new Date(e.date).getTime() >= Date.now()).slice(0, 6);

  return (
    <div className="panel p-4">
      <SectionHeader code="CAL" title="Economic Calendar" hint="High/medium impact, this week" />
      {!upcoming.length && <p className="text-sm text-ink-muted">No upcoming high-impact events this week.</p>}
      <ul className="divide-y divide-line">
        {upcoming.map((e, i) => (
          <li key={i} className="flex items-start justify-between gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase text-ink-faint">{e.country}</span>
                <span
                  className={`text-[10px] uppercase ${e.impact === "high" ? "text-down" : "text-amber"}`}
                >
                  {e.impact}
                </span>
              </div>
              <p className="text-sm text-ink">{e.title}</p>
            </div>
            <div className="mono-num shrink-0 text-right text-xs text-ink-muted">{timeUntil(e.date)}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
