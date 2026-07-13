"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
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

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-bg-surface/60 lg:flex">
      <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
        <span className="h-2 w-2 rounded-full bg-signal animate-pulseGlow" />
        <div className="leading-tight">
          <p className="eyebrow text-[9px] tracking-[0.18em] text-ink-faint">Elstand Intelligence</p>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold tracking-tight">NOCTURN</span>
            <span className="eyebrow rounded border border-signal/40 px-1.5 py-0.5 text-[9px] font-semibold text-signal-glow">AI</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-2.5 rounded-md border-l-2 px-3 py-2 text-sm transition-colors",
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
          className="flex items-center gap-2.5 rounded-md px-3 py-2 text-xs text-ink-faint hover:text-ink-muted"
        >
          <BookOpen size={14} />
          Methodology
        </Link>
        <p className="px-3 pb-1 pt-2 text-[10px] leading-relaxed text-ink-faint">
          Paper trading only — bukan nasihat keuangan.
        </p>
      </div>
    </aside>
  );
}
