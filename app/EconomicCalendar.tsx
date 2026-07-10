'use client';
import { useEffect, useState } from 'react';

type Event = {
  date: string;
  time: string;
  country: string;
  event: string;
  importance: 'low' | 'medium' | 'high';
  forecast: string;
  previous: string;
};

export default function EconomicCalendar() {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    // Demo data - upcoming macro events
    const demoEvents: Event[] = [
      {
        date: '2026-07-11',
        time: '12:30 UTC',
        country: '🇺🇸 USA',
        event: 'CPI YoY (Jun)',
        importance: 'high',
        forecast: '2.9%',
        previous: '3.0%',
      },
      {
        date: '2026-07-15',
        time: '20:00 UTC',
        country: '🇺🇸 USA',
        event: 'Initial Jobless Claims',
        importance: 'medium',
        forecast: '235K',
        previous: '238K',
      },
      {
        date: '2026-07-17',
        time: '18:00 UTC',
        country: '🇺🇸 USA',
        event: 'FOMC Meeting Minutes',
        importance: 'high',
        forecast: '—',
        previous: '—',
      },
      {
        date: '2026-07-30',
        time: '20:00 UTC',
        country: '🇺🇸 USA',
        event: 'FOMC Rate Decision',
        importance: 'high',
        forecast: 'Hold',
        previous: 'Hold',
      },
      {
        date: '2026-08-01',
        time: '12:30 UTC',
        country: '🇪🇺 EUR',
        event: 'ECB Interest Rate Decision',
        importance: 'high',
        forecast: '3.75%',
        previous: '4.00%',
      },
      {
        date: '2026-08-06',
        time: '12:30 UTC',
        country: '🇺🇸 USA',
        event: 'Non-Farm Payroll',
        importance: 'high',
        forecast: '210K',
        previous: '206K',
      },
    ];

    setEvents(demoEvents);
  }, []);

  const getImportanceColor = (imp: string) => {
    if (imp === 'high') return 'bg-red-500/20 border-red-500/50';
    if (imp === 'medium') return 'bg-yellow-500/20 border-yellow-500/50';
    return 'bg-blue-500/20 border-blue-500/50';
  };

  const getImportanceIndicator = (imp: string) => {
    if (imp === 'high') return '🔴';
    if (imp === 'medium') return '🟡';
    return '🔵';
  };

  const isUpcoming = (date: string) => {
    return new Date(date) >= new Date();
  };

  return (
    <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 md:col-span-1">
      <h2 className="text-xs text-slate-400 uppercase mb-4 font-mono">📅 Macro Calendar</h2>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {events
          .filter((e) => isUpcoming(e.date))
          .map((event, i) => (
            <div
              key={i}
              className={`border rounded p-3 ${getImportanceColor(event.importance)}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs text-slate-400 font-mono">{event.date} • {event.time}</p>
                  <p className="text-sm font-semibold text-slate-100 mt-1">
                    {getImportanceIndicator(event.importance)} {event.event}
                  </p>
                </div>
                <span className="text-xs font-mono text-slate-400">{event.country}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-slate-900/50 p-2 rounded">
                  <p className="text-slate-500">Forecast</p>
                  <p className="text-slate-200 font-bold">{event.forecast}</p>
                </div>
                <div className="bg-slate-900/50 p-2 rounded">
                  <p className="text-slate-500">Previous</p>
                  <p className="text-slate-200 font-bold">{event.previous}</p>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
