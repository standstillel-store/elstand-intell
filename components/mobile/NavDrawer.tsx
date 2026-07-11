"use client";
import { useState } from "react";
import { Menu, X, LayoutGrid } from "lucide-react";
import clsx from "clsx";

export function NavDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Buka menu dashboard"
        className="flex h-8 w-8 shrink-0 items-center justify-center text-ink-muted hover:text-ink"
      >
        <Menu size={20} />
      </button>

      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden={!open}
        className={clsx(
          "fixed inset-0 z-40 bg-black/60 transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-label="Menu dashboard"
        className={clsx(
          "fixed inset-y-0 left-0 z-50 flex w-[78%] max-w-xs flex-col border-r border-line bg-bg-surface transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-signal animate-pulseGlow" />
            <span className="text-base font-bold tracking-tight">NOCTURN</span>
            <span className="eyebrow rounded border border-signal/40 px-1.5 py-0.5 text-[10px] font-semibold text-signal-glow">
              AI
            </span>
          </div>
          <button onClick={() => setOpen(false)} aria-label="Tutup menu" className="text-ink-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          <button
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-md border-l-2 border-signal bg-signal/10 px-3 py-2.5 text-sm font-medium text-ink"
          >
            <LayoutGrid size={16} className="text-signal-glow" />
            Dasbor Utama
          </button>
        </nav>

        <div className="m-3 rounded-md border border-dashed border-line px-3 py-3 text-center text-xs text-ink-faint">
          Dashboard tambahan akan muncul di sini.
        </div>
      </div>
    </>
  );
}
