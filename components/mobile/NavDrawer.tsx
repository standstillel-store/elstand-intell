"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  LayoutDashboard,
  Radar,
  Wallet,
  ClipboardList,
  BarChart3,
  Waves,
  Newspaper,
  CalendarDays,
  Settings,
  BookOpen,
} from "lucide-react";
import clsx from "clsx";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ai-signal", label: "AI Signal", icon: Radar },
  { href: "/paper-trader", label: "Paper Trader", icon: Wallet },
  { href: "/ai-journal", label: "AI Journal", icon: ClipboardList },
  { href: "/ai-performance", label: "AI Performance", icon: BarChart3 },
  { href: "/whale", label: "Whale", icon: Waves },
  { href: "/news", label: "News", icon: Newspaper },
  { href: "/economic-calendar", label: "Economic Calendar", icon: CalendarDays },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function NavDrawer() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

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
          <div className="leading-tight">
            <p className="eyebrow text-[9px] tracking-[0.18em] text-ink-faint">Elstand Intelligence</p>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-signal animate-pulseGlow" />
              <span className="text-base font-bold tracking-tight">NOCTURN</span>
            </div>
          </div>
          <button onClick={() => setOpen(false)} aria-label="Tutup menu" className="text-ink-muted hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={clsx(
                  "flex w-full items-center gap-2.5 rounded-md border-l-2 px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "border-signal bg-signal/10 font-medium text-ink"
                    : "border-transparent text-ink-muted hover:bg-bg-raised hover:text-ink"
                )}
              >
                <item.icon size={16} className={active ? "text-signal-glow" : ""} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-line p-3">
          <Link
            href="/methodology"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-xs text-ink-faint hover:text-ink-muted"
          >
            <BookOpen size={14} />
            Methodology
          </Link>
        </div>
      </div>
    </>
  );
}
