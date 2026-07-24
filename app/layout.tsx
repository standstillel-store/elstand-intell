import type { ReactNode } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { TokenAnalyzerProvider } from "@/components/token-analyzer/TokenAnalyzerContext";
import { TokenAnalyzerDrawer } from "@/components/token-analyzer/TokenAnalyzerDrawer";
import { ThemePreferenceProvider } from "@/components/ThemePreferenceProvider";
import { Web3Provider } from "@/components/providers/Web3Provider";
import { ActivityHeartbeat } from "@/components/providers/ActivityHeartbeat";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://elstand.ai"),
  title: {
    default: "ElStand AI | AI-Powered Crypto Market Intelligence",
    template: "%s | ElStand AI",
  },
  description:
    "ElStand AI is an AI-powered crypto market intelligence platform: AI analysis, technical indicators, a crypto scanner, news sentiment, risk tools, and paper trading.",
};

// Phase 3: this is the fix for the Wallet Connect crash — every page needs
// WagmiProvider/AppKit as an ancestor, and the root layout is the one place
// that's guaranteed to wrap everything, so it's mounted here rather than in
// AppShell (dashboard/page.tsx renders its own chrome without AppShell, so
// that would've missed a spot).
//
// Trade-off, disclosed on purpose: reading headers() here (needed for
// cookieToInitialState, which is what makes wagmi hydrate without a
// mismatch instead of flashing "disconnected" for a frame) opts the whole
// app into dynamic rendering — the landing page can no longer be statically
// generated at build time. Given wallet state is only ever read from
// Settings/Dashboard (both already behind middleware auth checks, so never
// static in practice) and the landing page itself stays cheap to render on
// demand, that cost is worth the correctness/simplicity of following
// wagmi's own documented SSR pattern exactly rather than hand-rolling a
// route-scoped alternative. Revisit with a route-group-scoped provider if
// landing-page TTFB ever becomes a measured problem.
export default function RootLayout({ children }: { children: ReactNode }) {
  const cookieHeader = headers().get("cookie");

  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="bg-bg text-ink font-sans antialiased">
        <ThemePreferenceProvider />
        <ActivityHeartbeat />
        <Web3Provider cookies={cookieHeader}>
          <TokenAnalyzerProvider>
            {children}
            <TokenAnalyzerDrawer />
          </TokenAnalyzerProvider>
        </Web3Provider>
      </body>
    </html>
  );
}
