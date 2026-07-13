import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { NavDrawer } from "./mobile/NavDrawer";
import { Footer } from "./Footer";
import { AIChatDock } from "./AIChatDock";

export function AppShell({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen lg:flex">
      <Sidebar />

      <div className="flex-1 lg:pl-60">
        {/* Mobile header */}
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur lg:hidden">
          <NavDrawer />
          <span className="truncate text-sm font-semibold tracking-tight">{title}</span>
        </div>

        {/* Desktop header */}
        <div className="sticky top-0 z-20 hidden border-b border-line bg-bg/90 px-6 py-4 backdrop-blur lg:block">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
            </div>
            {right}
          </div>
        </div>

        <main className="mx-auto max-w-6xl px-4 py-5 lg:px-6 lg:py-6">
          <div className="space-y-5">{children}</div>
        </main>

        <Footer />
      </div>

      <AIChatDock context={{}} />
    </div>
  );
}
