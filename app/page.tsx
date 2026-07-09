import FearGreed from './components/FearGreed';
import MarketTicker from './components/MarketTicker';
import NewsFeed from './components/NewsFeed';
import EconomicCalendar from './components/EconomicCalendar';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <h1 className="text-3xl font-bold mb-1 font-mono tracking-wide">
        NOCTURN <span className="text-signal">·</span> INTEL
      </h1>
      <p className="text-slate-500 text-sm mb-8 font-mono uppercase tracking-widest">
        Crypto Intelligence Dashboard
      </p>

      {/* Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <FearGreed />
        <MarketTicker />

        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <h2 className="text-xs text-slate-400 uppercase tracking-wider mb-4 font-mono">
            Status
          </h2>
          <p className="text-signal text-sm font-mono">✓ Fear &amp; Greed: LIVE</p>
          <p className="text-signal text-sm font-mono">✓ Market Data: LIVE</p>
          <p className="text-signal text-sm font-mono">✓ News Feed: LIVE</p>
          <p className="text-signal text-sm font-mono">✓ Economic Calendar: LIVE</p>
          <p className="text-slate-500 text-sm font-mono">○ Whale Tracker: belum tersedia</p>
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <NewsFeed />
        <EconomicCalendar />
      </div>
    </div>
  );
}
