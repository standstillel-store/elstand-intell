import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { TokenAnalyzerProvider } from "@/components/token-analyzer/TokenAnalyzerContext";
import { TokenAnalyzerDrawer } from "@/components/token-analyzer/TokenAnalyzerDrawer";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ELSTAND INTELLIGENCE | ElVoid AI Crypto Terminal",
  description:
    "ELSTAND INTELLIGENCE is a professional crypto intelligence terminal powered by ElVoid AI: live heatmap, AI trade signals, paper trader, token scanner, whale flow, funding, news, and economic calendar in one dark, fast dashboard.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="bg-bg text-ink font-sans antialiased">
        <TokenAnalyzerProvider>
          {children}
          <TokenAnalyzerDrawer />
        </TokenAnalyzerProvider>
      </body>
    </html>
  );
}
