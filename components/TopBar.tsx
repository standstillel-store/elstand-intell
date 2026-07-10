"use client";
import { useEffect, useState } from "react";

export function TopBar({ btcPrice, mcap, fng }: { btcPrice?: number; mcap?: number; fng?: number }) {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const tick = () => setTime(`${new Date().toUTCString().split(" ")[4]} UTC`);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-signal animate-pulseGlow" />
          <span className="text-lg font-bold tracking-tight">NOCTRUN</span>
          <span className="eyebrow rounded border border-signal/40 px-1.5 py-0.5 text-[10px] font-semibold text-signal-glow">
            AI
          </span>
        </div>
        <div className="mono-num hidden items-center gap-5 text-xs text-ink-muted sm:flex">
          {btcPrice !== undefined && <span>BTC ${btcPrice.toLocaleString()}</span>}
          {mcap !== undefined && <span>MCAP ${(mcap / 1e9).toFixed(1)}B</span>}
          {fng !== undefined && <span>F&amp;G {fng}</span>}
          <span suppressHydrationWarning>{time}</span>
        </div>
      </div>
    </header>
  );
}
