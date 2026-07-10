import FearGreed from './components/FearGreed';
import MarketTicker from './components/MarketTicker';
import WhaleTracker from './components/WhaleTracker';
import NewsFeed from './components/NewsFeed';
import EconomicCalendar from './components/EconomicCalendar';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <h1 className="text-4xl font-bold mb-1 font-mono">
        NOCTURN <span className="text-green-400">·</span> INTEL
      </h1>
      <p className="text-slate-500 text-sm mb-8 font-mono uppercase">Crypto Intelligence Dashboard</p>

      {/* Row 1: Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <FearGreed />
        <MarketTicker />
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <h2 className="text-xs text-slate-400 uppercase mb-4 font-mono">Status</h2>
          <p className="text-green-400 text-sm font-mono">✓ Fear &amp; Greed: LIVE</p>
          <p className="text-green-400 text-sm font-mono">✓ Market: LIVE</p>
          <p className="text-green-400 text-sm font-mono">✓ Whale Tracker: LIVE</p>
          <p className="text-green-400 text-sm font-mono">✓ News: LIVE</p>
          <p className="text-green-400 text-sm font-mono">✓ Calendar: LIVE</p>
        </div>
      </div>

      {/* Row 2: Whale Tracker */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <WhaleTracker />
      </div>

      {/* Row 3: News + Calendar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <NewsFeed />
        <EconomicCalendar />
      </div>
    </div>
  );
}
