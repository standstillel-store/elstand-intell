import { Sparkles } from "lucide-react";
import { SectionHeader } from "@/components/SectionHeader";

/** Renders the plain-language read-out from lib/analysis.ts's generateMarketSummary — same rule-based engine, no extra LLM cost. */
export function AISummaryCard({ summary }: { summary: string }) {
  return (
    <div className="glow-card p-4">
      <SectionHeader code="SUM" title="AI Summary" />
      <div className="flex gap-2.5">
        <Sparkles size={15} className="mt-0.5 shrink-0 text-signal-glow" />
        <p className="text-[13px] leading-relaxed text-ink-muted">{summary}</p>
      </div>
    </div>
  );
}
