"use client";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { Info } from "lucide-react";
import { SectionHeader } from "@/components/SectionHeader";
import { LiveDot } from "@/components/ui/LiveDot";
import {
  MARKET_MAP_EDGES,
  buildMarketMapNodes,
  type MarketMapLiveInputs,
  type MarketMapNodeId,
} from "@/lib/intelligence/marketMap";
import type { DisplayTone } from "@/lib/intelligence/shared";

const TONE_BORDER: Record<DisplayTone, string> = {
  up: "border-up/30",
  down: "border-down/30",
  amber: "border-amber/30",
  neutral: "border-line",
};
const TONE_BORDER_SELECTED: Record<DisplayTone, string> = {
  up: "border-up shadow-glow-up",
  down: "border-down shadow-glow-down",
  amber: "border-amber",
  neutral: "border-signal shadow-glow-signal",
};
const TONE_DOT: Record<DisplayTone, "up" | "down" | "amber" | "signal"> = {
  up: "up",
  down: "down",
  amber: "amber",
  neutral: "signal",
};
const TONE_TEXT: Record<DisplayTone, string> = {
  up: "text-up",
  down: "text-down",
  amber: "text-amber",
  neutral: "text-ink",
};
const TONE_STROKE: Record<DisplayTone, string> = {
  up: "#22C55E",
  down: "#EF4444",
  amber: "#FFB020",
  neutral: "#6E5BFF",
};

function narrativeKey(tone: DisplayTone): "up" | "down" | "neutral" {
  return tone === "up" ? "up" : tone === "down" ? "down" : "neutral";
}

interface PathModel {
  key: string;
  d: string;
  active: boolean;
  tone: DisplayTone;
}

export function GlobalIntelligenceMap({ live }: { live?: MarketMapLiveInputs }) {
  const nodes = buildMarketMapNodes(live);
  const [selectedId, setSelectedId] = useState<MarketMapNodeId>("btc");
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Partial<Record<MarketMapNodeId, HTMLButtonElement | null>>>({});
  const [paths, setPaths] = useState<PathModel[]>([]);

  // Read via a ref so the ResizeObserver effect below can stay mount-only
  // while `recompute` always sees the latest nodes/selection.
  const stateRef = useRef({ nodes, selectedId });
  stateRef.current = { nodes, selectedId };

  const selectedNode = nodes.find((n) => n.id === selectedId) ?? nodes[0];

  const recompute = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const { nodes: currentNodes, selectedId: currentSelected } = stateRef.current;
    const containerRect = container.getBoundingClientRect();
    const anchors: Partial<Record<MarketMapNodeId, { x: number; top: number; bottom: number }>> = {};

    (Object.keys(nodeRefs.current) as MarketMapNodeId[]).forEach((id) => {
      const el = nodeRefs.current[id];
      if (!el) return;
      const r = el.getBoundingClientRect();
      anchors[id] = {
        x: r.left - containerRect.left + r.width / 2,
        top: r.top - containerRect.top,
        bottom: r.top - containerRect.top + r.height,
      };
    });

    const nextPaths = MARKET_MAP_EDGES.map((edge) => {
      const a = anchors[edge.from];
      const b = anchors[edge.to];
      if (!a || !b) return null;
      const startX = a.x;
      const startY = a.bottom;
      const endX = b.x;
      const endY = b.top;
      const midY = startY + (endY - startY) / 2;
      const d = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
      const active = edge.from === currentSelected || edge.to === currentSelected;
      const toneSource = currentNodes.find((n) => n.id === edge.to);
      return { key: `${edge.from}-${edge.to}`, d, active, tone: toneSource?.tone ?? "neutral" };
    }).filter((p): p is PathModel => Boolean(p));

    setPaths(nextPaths);
  }, []);

  // Mount-only: set up measurement + resize/font-settle recompute.
  useLayoutEffect(() => {
    recompute();
    const ro = new ResizeObserver(() => recompute());
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", recompute);
    const t1 = setTimeout(recompute, 120);
    const t2 = setTimeout(recompute, 500);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recompute);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [recompute]);

  // Re-measure whenever the selection changes (card content/height can shift).
  useLayoutEffect(() => {
    recompute();
  }, [selectedId, nodes.length, recompute]);

  function setNodeRef(id: MarketMapNodeId) {
    return (el: HTMLButtonElement | null) => {
      nodeRefs.current[id] = el;
    };
  }

  function renderNode(id: MarketMapNodeId, opts?: { wide?: boolean }) {
    const node = nodes.find((n) => n.id === id);
    if (!node) return null;
    const selected = node.id === selectedId;
    return (
      <button
        key={node.id}
        ref={setNodeRef(node.id)}
        type="button"
        aria-pressed={selected}
        onClick={() => setSelectedId(node.id)}
        className={clsx(
          "group relative z-10 rounded-xl border bg-bg-surface p-3 text-left shadow-card transition-all duration-200",
          "hover:-translate-y-0.5 hover:border-signal/40",
          selected ? TONE_BORDER_SELECTED[node.tone] : TONE_BORDER[node.tone],
          opts?.wide ? "w-full sm:mx-auto sm:max-w-xs" : "w-full"
        )}
      >
        <div className="flex items-center gap-1.5">
          <LiveDot tone={TONE_DOT[node.tone]} />
          <span className="eyebrow text-[10px] tracking-wide text-ink-faint">{node.code}</span>
          {node.sample && (
            <span className="ml-auto shrink-0 rounded border border-line px-1 text-[9px] uppercase tracking-wide text-ink-faint">
              contoh
            </span>
          )}
        </div>
        <p className="mt-1 truncate text-sm font-semibold text-ink">{node.title}</p>
        {node.metrics[0] && (
          <p className={clsx("mt-0.5 truncate text-[11px]", TONE_TEXT[node.metrics[0].tone ?? "neutral"])}>
            {node.metrics[0].label}: {node.metrics[0].value}
          </p>
        )}
      </button>
    );
  }

  return (
    <div className="glow-card p-4">
      <SectionHeader code="MAP" title="Global Market Intelligence Map" hint="Klik salah satu node" />

      <div ref={containerRef} className="relative space-y-3 py-2">
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full">
          {paths.map((p) => (
            <path
              key={p.key}
              d={p.d}
              fill="none"
              stroke={p.active ? TONE_STROKE[p.tone] : "#23262F"}
              strokeWidth={p.active ? 2 : 1.5}
              strokeOpacity={p.active ? 0.9 : 0.6}
              strokeDasharray={p.active ? "6 6" : undefined}
              strokeLinecap="round"
              className={p.active ? "animate-dashFlow" : undefined}
            />
          ))}
        </svg>

        <div className="flex justify-center">{renderNode("macro", { wide: true })}</div>
        <div className="flex justify-center">{renderNode("sentiment", { wide: true })}</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {renderNode("usd")}
          {renderNode("gold")}
          {renderNode("stocks")}
        </div>
        <div className="flex justify-center">{renderNode("crypto", { wide: true })}</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {renderNode("btc")}
          {renderNode("eth")}
          {renderNode("altcoin")}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={selectedNode.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="mt-4 rounded-xl border border-line bg-bg-raised p-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            <LiveDot tone={TONE_DOT[selectedNode.tone]} />
            <span className="eyebrow text-[11px] text-ink-faint">{selectedNode.code}</span>
            <h3 className="text-sm font-semibold text-ink">{selectedNode.title}</h3>
            {selectedNode.sample && (
              <span className="rounded border border-line px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-ink-faint">
                Data contoh
              </span>
            )}
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{selectedNode.summary}</p>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {selectedNode.metrics.map((m) => (
              <div key={m.label} className="rounded-lg border border-line bg-bg-surface px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-ink-faint">{m.label}</p>
                <p className={clsx("mono-num mt-0.5 text-sm font-medium", TONE_TEXT[m.tone ?? "neutral"])}>{m.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-lg border border-signal/20 bg-signal/5 px-3 py-2.5">
            <p className="eyebrow mb-1 text-[10px] text-signal-glow">Kenapa ini penting</p>
            <p className="text-[13px] leading-relaxed text-ink-muted">{selectedNode.narrative[narrativeKey(selectedNode.tone)]}</p>
          </div>
        </motion.div>
      </AnimatePresence>

      <p className="mt-3 flex items-start gap-1.5 text-[11px] text-ink-faint">
        <Info size={12} className="mt-0.5 shrink-0" />
        Peta ini menjelaskan hubungan antar market, bukan sinyal beli/jual. Node bertanda &quot;contoh&quot; masih memakai data
        ilustrasi sampai feed live terhubung.
      </p>
    </div>
  );
}
