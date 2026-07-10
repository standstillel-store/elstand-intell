'use client';
import { useEffect, useState } from 'react';

type CalendarEvent = {
  date: string;
  time: string;
  country: string;
  event: string;
  impact: string;
  forecast: string;
  previous: string;
  actual: string;
};

export default function EconomicCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/calendar')
      .then((res) => res.json())
      .then((data) => {
        setEvents(data.events || []);
        setIsDemo(data.isDemo || false);
        setMessage(data.message || '');
        setLoading(false);
      })
      .catch((err) => {
        setMessage(err.message);
        setLoading(false);
      });
  }, []);

  const getImpactColor = (impact: string) => {
    if (impact === 'High') return 'bg-red-500/20 border-red-500/50';
    if (impact === 'Medium') return 'bg-yellow-500/20 border-yellow-500/50';
    return 'bg-blue-500/20 border-blue-500/50';
  };

  const getImpactIndicator = (impact: string) => {
    if (impact === 'High') return '🔴';
    if (impact === 'Medium') return '🟡';
    return '🔵';
  };

  return (
    <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 md:col-span-1">
      <h2 className="text-xs text-slate-400 uppercase mb-4 font-mono">📅 Macro Calendar</h2>

      {loading && <p className="text-slate-500 text-sm font-mono">Loading calendar...</p>}
      {!loading && isDemo && (
        <div className="mb-3 p-2 bg-yellow-500/20 border border-yellow-500/50 rounded text-xs font-mono">
          <p className="text-yellow-300">⚠️ Demo Data</p>
          <p className="text-yellow-200">{message}</p>
        </div>
      )}
      {!loading && events.length === 0 && <p className="text-slate-500 text-sm">No events found</p>}

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {events.map((ev, i) => (
          <div key={i} className={`border rounded p-3 space-y-1 ${getImpactColor(ev.impact)}`}>
            <p className="text-xs text-slate-400 font-mono mb-1">{ev.date}</p>

            <p className="text-xs font-mono text-slate-200">🕒 {ev.time}</p>
            <p className="text-xs font-mono text-slate-200">🌍 {ev.country}</p>
            <p className="text-sm font-semibold text-slate-100">📊 {ev.event}</p>
            <p className="text-xs font-mono text-slate-200">
              🔥 {getImpactIndicator(ev.impact)} {ev.impact}
            </p>
            <p className="text-xs font-mono text-slate-200">📈 Forecast: {ev.forecast}</p>
            <p className="text-xs font-mono text-slate-200">📉 Previous: {ev.previous}</p>
            <p className="text-xs font-mono text-green-400">✅ Actual: {ev.actual}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
