'use client';
import { useEffect, useState } from 'react';

type Event = {
  event: string;
  date: string;
  impact: string;
  forecast: string;
  previous: string;
  actual: string;
};

export default function EconomicCalendar() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/economic-calendar')
      .then((res) => res.json())
      .then((data) => {
        setEvents(data.events || []);
        setLoading(false);
      })
      .catch(() => {
        setEvents(getFallbackEvents());
        setLoading(false);
      });
  }, []);

  const getImpactColor = (impact: string) => {
    if (impact?.toLowerCase().includes('high')) return '#FF3B5C';
    if (impact?.toLowerCase().includes('medium')) return '#FFB020';
    return '#6B7386';
  };

  return (
    <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
      <h2 className="text-xs text-slate-400 uppercase tracking-wider mb-4 font-mono">
        📊 Economic Calendar (CPI / FOMC)
      </h2>

      {loading ? (
        <p className="text-slate-500 text-sm font-mono">Loading...</p>
      ) : events.length === 0 ? (
        <p className="text-slate-500 text-sm font-mono">No events found</p>
      ) : (
        <div className="space-y-3">
          {events.map((event, i) => (
            <div key={i} className="border-b border-slate-700 pb-2">
              <div className="flex items-start gap-2">
                <div
                  className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                  style={{ backgroundColor: getImpactColor(event.impact) }}
                ></div>
                <div className="flex-1">
                  <p className="text-sm font-mono font-semibold text-white">
                    {event.event}
                  </p>
                  <p className="text-xs text-slate-400 font-mono">
                    {new Date(event.date).toLocaleDateString()} {new Date(event.date).toLocaleTimeString()}
                  </p>
                  {(event.forecast || event.previous) && (
                    <p className="text-xs text-slate-500 font-mono mt-1">
                      {event.forecast && `Forecast: ${event.forecast}`}
                      {event.previous && ` | Previous: ${event.previous}`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getFallbackEvents() {
  return [
    {
      event: 'US CPI (Jun) YoY',
      date: new Date().toISOString(),
      impact: 'High',
      forecast: '2.9%',
      previous: '3.1%',
      actual: '',
    },
    {
      event: 'FOMC Meeting Minutes',
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      impact: 'High',
      forecast: '',
      previous: '',
      actual: '',
    },
    {
      event: 'US Jobless Claims',
      date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      impact: 'Medium',
      forecast: '235K',
      previous: '238K',
      actual: '',
    },
  ];
}
