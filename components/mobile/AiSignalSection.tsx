import type { ReactNode } from "react";
import { AccordionSection } from "./AccordionSection";
import { ScoreBadge } from "@/components/ScoreBadge";
import { formatPct } from "@/lib/format";
import type { CoinMarket, PumpCandidate, RugpullRisk } from "@/lib/types";

function SubLabel({ children }: { children: ReactNode }) {
  return <p className="mb-1.5 mt-3 text-[11px] uppercase tracking-wide text-ink-faint first:mt-0">{children}</p>;
}

export function AiSignalSection({
  pumpCandidates,
  topDecliners,
  rugpullRisks,
  manipulationAlerts,
}: {
  pumpCandidates: PumpCandidate[];
  topDecliners: CoinMarket[];
  rugpullRisks: RugpullRisk[];
  manipulationAlerts: RugpullRisk[];
}) {
  const topPump = pumpCandidates.slice(0, 3);
  const topRisk = rugpullRisks.slice(0, 3);

  const glance = topPump[0] ? (
    <span className="mono-num text-xs font-medium text-signal-glow">{topPump[0].symbol} {topPump[0].score}</span>
  ) : undefined;

  return (
    <AccordionSection code="SIG" title="AI Signal" glance={glance}>
      <SubLabel>Top Pump Probability</SubLabel>
      {topPump.length ? (
        <ul className="space-y-1.5">
          {topPump.map((c) => (
            <li key={c.id} className="flex items-center gap-3">
              <ScoreBadge score={c.score} variant="pump" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.symbol}</span>
              <span className={`mono-num text-xs ${c.change24h >= 0 ? "text-up" : "text-down"}`}>
                {formatPct(c.change24h)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-muted">Belum ada kandidat pump yang lolos threshold saat ini.</p>
      )}

      <SubLabel>Top Dump Probability</SubLabel>
      {topDecliners.length ? (
        <ul className="space-y-1.5">
          {topDecliners.slice(0, 3).map((m) => (
            <li key={m.id} className="flex items-center gap-3">
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{m.symbol.toUpperCase()}</span>
              <span className="mono-num text-xs text-down">
                {formatPct(m.price_change_percentage_24h_in_currency ?? 0)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-muted">Tidak ada penurunan tajam yang tercatat saat ini.</p>
      )}
      <p className="mt-1 text-[11px] text-ink-faint">Berdasarkan penurunan 24 jam terbesar — bukan prediksi arah.</p>

      <SubLabel>Rugpull Risk</SubLabel>
      {topRisk.length ? (
        <ul className="space-y-1.5">
          {topRisk.map((r) => (
            <li key={r.id} className="flex items-center gap-3">
              <ScoreBadge score={r.score} variant="risk" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.symbol}</span>
              <span className="text-[10px] uppercase text-ink-faint">{r.network}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-muted">Tidak ada token yang lolos threshold risiko saat ini.</p>
      )}

      <SubLabel>Manipulation Alert</SubLabel>
      {manipulationAlerts.length ? (
        <ul className="space-y-1.5">
          {manipulationAlerts.map((r) => (
            <li key={r.id} className="text-sm">
              <div className="flex items-center gap-3">
                <ScoreBadge score={r.score} variant="risk" />
                <span className="font-medium">{r.symbol}</span>
              </div>
              <p className="mt-0.5 pl-11 text-xs text-ink-muted">{r.flags.find((f) => /5x\+|48h|listing/.test(f))}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-muted">Tidak ada pola volume/liquidity mencurigakan yang terdeteksi.</p>
      )}
    </AccordionSection>
  );
}
