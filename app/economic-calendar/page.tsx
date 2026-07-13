import { AppShell } from "@/components/AppShell";
import { getEconomicCalendar } from "@/lib/economiccalendar";
import type { EconomicEvent } from "@/lib/types";

export const metadata = {
  title: "Economic Calendar | Nocturn",
};

const IMPACT_STYLE: Record<string, string> = {
  high: "text-down border-down/30 bg-down/10",
  medium: "text-amber border-amber/30 bg-amber/10",
  low: "text-ink-faint border-line bg-bg-raised",
};

function dayKey(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });
}

export default async function EconomicCalendarPage() {
  const events = await getEconomicCalendar().catch(() => []);
  const sorted = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const byDay = new Map<string, EconomicEvent[]>();
  for (const e of sorted) {
    const key = dayKey(e.date);
    byDay.set(key, [...(byDay.get(key) ?? []), e]);
  }

  return (
    <AppShell title="Economic Calendar" subtitle="Event makro high/medium impact minggu ini — dipakai ElVoid AI untuk Risk Assessment scan.">
      {!sorted.length && <div className="panel p-6 text-center text-sm text-ink-muted">Tidak ada event terjadwal minggu ini.</div>}

      <div className="space-y-4">
        {[...byDay.entries()].map(([day, dayEvents]) => (
          <div key={day} className="panel p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">{day}</p>
            <ul className="divide-y divide-line">
              {dayEvents.map((e, i) => (
                <li key={i} className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase text-ink-faint">{e.country}</span>
                      <span className={`rounded border px-1.5 py-0.5 text-[10px] uppercase ${IMPACT_STYLE[e.impact]}`}>{e.impact}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-ink">{e.title}</p>
                    {(e.forecast || e.previous) && (
                      <p className="mt-0.5 text-[11px] text-ink-faint">
                        {e.forecast && <>Forecast: {e.forecast} </>}
                        {e.previous && <>· Previous: {e.previous}</>}
                      </p>
                    )}
                  </div>
                  <div className="mono-num shrink-0 text-right text-xs text-ink-muted">
                    {new Date(e.date).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
