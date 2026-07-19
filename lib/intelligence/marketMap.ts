import { deriveTrend, type TrendTone, type DisplayTone } from "./shared";

// ---------------------------------------------------------------------------
// Global Market Intelligence Map — data model.
//
// This is the relationship tree behind ElStand AI's core thesis: crypto
// doesn't move in a vacuum. Macro events shape global sentiment, which
// shapes USD / Gold / Stocks, which together shape crypto liquidity, which
// finally shapes BTC / ETH / Altcoin. Every node below carries a short set
// of metrics and a plain-language "why" for both directions (strength vs
// weakness) so clicking a node always explains the causal chain, not just
// a number.
//
// Data honesty: BTC/ETH/Altcoin/Crypto Market figures can be wired to real
// CoinGecko data via `buildMarketMapNodes()`. Gold and Stocks (Nasdaq/S&P500)
// are not yet wired to a live source in this codebase, so their metrics are
// clearly flagged `sample: true` until a feed is connected (see comments
// below for suggested free sources).
// ---------------------------------------------------------------------------

export type MarketMapNodeId =
  | "macro"
  | "sentiment"
  | "usd"
  | "gold"
  | "stocks"
  | "crypto"
  | "btc"
  | "eth"
  | "altcoin";

export interface MarketMapEdge {
  from: MarketMapNodeId;
  to: MarketMapNodeId;
}

export const MARKET_MAP_EDGES: MarketMapEdge[] = [
  { from: "macro", to: "sentiment" },
  { from: "sentiment", to: "usd" },
  { from: "sentiment", to: "gold" },
  { from: "sentiment", to: "stocks" },
  { from: "usd", to: "crypto" },
  { from: "gold", to: "crypto" },
  { from: "stocks", to: "crypto" },
  { from: "crypto", to: "btc" },
  { from: "crypto", to: "eth" },
  { from: "crypto", to: "altcoin" },
];

export interface MarketMapMetric {
  label: string;
  value: string;
  tone?: DisplayTone;
  /** True when this figure is illustrative and not yet wired to a live feed. */
  sample?: boolean;
}

export interface MarketMapNode {
  id: MarketMapNodeId;
  code: string;
  title: string;
  tier: 0 | 1 | 2 | 3 | 4;
  tone: DisplayTone;
  summary: string;
  metrics: MarketMapMetric[];
  /** Plain-language causal chain, shown under the node detail panel. */
  narrative: {
    up: string;
    down: string;
    neutral: string;
  };
  /** True when the whole node is still illustrative (no live source wired). */
  sample?: boolean;
}

export interface MarketMapLiveInputs {
  /** Overall crypto tone, e.g. derived from total market cap 24h change. */
  cryptoTone?: TrendTone;
  totalMarketCapUsd?: number;
  totalMarketCapChange24h?: number;
  btcPrice?: number;
  btcChange24h?: number;
  btcChange7d?: number;
  btcDominance?: number;
  ethPrice?: number;
  ethChange24h?: number;
  ethChange7d?: number;
  altcoinChange24h?: number;
  altcoinMarketCapUsd?: number;
  topSectorLabel?: string;
  dxyValue?: number;
  dxyChangePct?: number;
}

function fmtUsdShort(n?: number): string | undefined {
  if (n === undefined || !isFinite(n)) return undefined;
  if (Math.abs(n) >= 1_000_000_000_000) return `$${(n / 1_000_000_000_000).toFixed(2)}T`;
  if (Math.abs(n) >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function fmtPct(n?: number): string | undefined {
  if (n === undefined || !isFinite(n)) return undefined;
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

/** Base illustrative dataset — used whenever a live value isn't supplied. */
export function getSampleMarketMapNodes(): MarketMapNode[] {
  return [
    {
      id: "macro",
      code: "MAC",
      title: "News & Macro Event",
      tier: 0,
      tone: "neutral",
      summary: "FOMC minutes & CPI print keluar minggu ini — pasar menunggu arah kebijakan The Fed.",
      metrics: [
        { label: "Event terdekat", value: "FOMC Minutes", tone: "amber", sample: true },
        { label: "Impact", value: "High", tone: "amber", sample: true },
        { label: "Konsensus pasar", value: "Hawkish-leaning", sample: true },
      ],
      narrative: {
        up: "Data makro lebih hawkish dari ekspektasi -> ekspektasi suku bunga naik -> tekanan turun ke aset berisiko.",
        down: "Data makro lebih dovish dari ekspektasi -> ekspektasi suku bunga turun -> ruang naik untuk aset berisiko.",
        neutral: "Data makro sesuai ekspektasi -> dampak terbatas ke sentimen risk-on/off.",
      },
      sample: true,
    },
    {
      id: "sentiment",
      code: "SENT",
      title: "Global Sentiment",
      tier: 1,
      tone: "neutral",
      summary: "Sentimen global saat ini campuran — belum ada arah dominan antara risk-on dan risk-off.",
      metrics: [
        { label: "Regime", value: "Transisi", tone: "amber", sample: true },
        { label: "Volatilitas", value: "Sedang", sample: true },
      ],
      narrative: {
        up: "Sentimen risk-on menguat -> likuiditas mengalir ke aset berisiko termasuk saham & crypto.",
        down: "Sentimen risk-off menguat -> dana berputar ke aset safe-haven (USD, Gold, obligasi).",
        neutral: "Sentimen belum menentu -> pasar cenderung sideways menunggu katalis berikutnya.",
      },
      sample: true,
    },
    {
      id: "usd",
      code: "USD",
      title: "USD",
      tier: 2,
      tone: "neutral",
      summary: "Dolar bergerak dalam rentang sempit menjelang keputusan suku bunga berikutnya.",
      metrics: [
        { label: "DXY Index", value: "104.2", tone: "neutral", sample: true },
        { label: "Dollar Strength", value: "Netral", tone: "neutral", sample: true },
        { label: "Liquidity Impact", value: "Netral ke aset berisiko", tone: "neutral", sample: true },
      ],
      narrative: {
        up: "USD naik -> likuiditas dolar mengetat -> tekanan jual meningkat di crypto & aset berisiko lain.",
        down: "USD melemah -> risk appetite meningkat -> BTC dan altcoin berpotensi mendapatkan inflow.",
        neutral: "USD bergerak sideways -> dampak ke likuiditas crypto relatif netral.",
      },
      sample: true,
    },
    {
      id: "gold",
      code: "XAU",
      title: "Gold",
      tier: 2,
      tone: "neutral",
      summary: "Emas stabil di dekat level tertinggi — permintaan safe-haven masih terjaga.",
      metrics: [
        { label: "Gold Price", value: "$2,415/oz", tone: "neutral", sample: true },
        { label: "Risk Sentiment", value: "Safe-haven demand stabil", tone: "neutral", sample: true },
      ],
      narrative: {
        up: "Emas naik tajam -> biasanya mencerminkan risk-off -> tekanan turun sementara ke aset spekulatif.",
        down: "Emas melemah -> minat ke safe-haven berkurang -> ruang bagi aset berisiko termasuk crypto.",
        neutral: "Emas sideways -> tidak ada sinyal risk-on/off yang kuat dari sisi ini.",
      },
      sample: true,
    },
    {
      id: "stocks",
      code: "EQT",
      title: "Stocks",
      tier: 2,
      tone: "neutral",
      summary: "Nasdaq & S&P500 menguat tipis — korelasi dengan BTC masih relatif tinggi.",
      metrics: [
        { label: "Nasdaq", value: "+0.4%", tone: "up", sample: true },
        { label: "S&P 500", value: "+0.3%", tone: "up", sample: true },
        { label: "Regime", value: "Risk On", tone: "up", sample: true },
      ],
      narrative: {
        up: "Saham teknologi menguat -> risk appetite tinggi -> historically berkorelasi positif dengan BTC & altcoin.",
        down: "Saham teknologi melemah -> risk-off menyebar lintas aset -> crypto sering ikut tertekan jangka pendek.",
        neutral: "Saham bergerak flat -> korelasi ke crypto tidak signifikan hari ini.",
      },
      sample: true,
    },
    {
      id: "crypto",
      code: "CRY",
      title: "Crypto Market",
      tier: 3,
      tone: "neutral",
      summary: "Total kapitalisasi pasar crypto bergerak mengikuti kombinasi likuiditas USD dan sentimen saham.",
      metrics: [
        { label: "Total Market Cap", value: "—", tone: "neutral" },
        { label: "24h Change", value: "—", tone: "neutral" },
        { label: "BTC Dominance", value: "—", tone: "neutral" },
      ],
      narrative: {
        up: "Likuiditas makro mendukung -> capital inflow ke crypto -> BTC memimpin, altcoin menyusul.",
        down: "Likuiditas makro mengetat -> capital outflow dari crypto -> tekanan jual merata di BTC & altcoin.",
        neutral: "Likuiditas makro netral -> market cap crypto bergerak dalam rentang, menunggu katalis baru.",
      },
    },
    {
      id: "btc",
      code: "BTC",
      title: "BTC",
      tier: 4,
      tone: "neutral",
      summary: "—",
      metrics: [
        { label: "Trend", value: "—", tone: "neutral" },
        { label: "Market Structure", value: "—", tone: "neutral" },
        { label: "Institutional Flow", value: "—", tone: "neutral", sample: true },
      ],
      narrative: {
        up: "Struktur harga higher-high/higher-low -> BTC berperan sebagai penggerak utama capital inflow crypto.",
        down: "Struktur harga lower-high/lower-low -> BTC menyeret sentimen altcoin ikut melemah.",
        neutral: "BTC konsolidasi -> pasar menunggu breakout arah berikutnya sebelum altcoin bergerak besar.",
      },
    },
    {
      id: "eth",
      code: "ETH",
      title: "ETH",
      tier: 4,
      tone: "neutral",
      summary: "—",
      metrics: [
        { label: "Trend", value: "—", tone: "neutral" },
        { label: "ETH/BTC Ratio", value: "—", tone: "neutral", sample: true },
        { label: "L2 & Staking Activity", value: "Stabil", tone: "neutral", sample: true },
      ],
      narrative: {
        up: "ETH menguat lebih cepat dari BTC -> ETH/BTC ratio naik -> minat ke Layer 2 & DeFi cenderung meningkat.",
        down: "ETH melemah lebih dalam dari BTC -> ETH/BTC ratio turun -> rotasi sementara kembali ke BTC.",
        neutral: "ETH bergerak sejalan dengan BTC -> belum ada rotasi berarti antar keduanya.",
      },
    },
    {
      id: "altcoin",
      code: "ALT",
      title: "Altcoin",
      tier: 4,
      tone: "neutral",
      summary: "—",
      metrics: [
        { label: "Market Cap", value: "—", tone: "neutral" },
        { label: "Sector Rotation", value: "—", tone: "neutral", sample: true },
        { label: "Momentum", value: "—", tone: "neutral" },
      ],
      narrative: {
        up: "BTC stabil & dominance turun -> likuiditas rotasi ke altcoin -> momentum sektor tertentu menguat.",
        down: "BTC dominance naik -> likuiditas keluar dari altcoin -> tekanan jual merata di luar BTC.",
        neutral: "Rotasi sektor campuran -> beberapa sektor menguat, lainnya tertinggal.",
      },
    },
  ];
}

/**
 * Merge live figures the app already computes (CoinGecko markets, global
 * data, DXY) into the sample dataset. Anything not passed in keeps its
 * illustrative sample value so the map never shows a blank node.
 */
export function buildMarketMapNodes(live?: MarketMapLiveInputs): MarketMapNode[] {
  const nodes = getSampleMarketMapNodes();
  if (!live) return nodes;

  const btcTrend = deriveTrend(live.btcChange24h, live.btcChange7d);
  const ethTrend = deriveTrend(live.ethChange24h, live.ethChange7d);
  const cryptoTone: TrendTone =
    live.cryptoTone ?? deriveTrend(live.totalMarketCapChange24h, live.totalMarketCapChange24h).tone;
  const altTone = deriveTrend(live.altcoinChange24h, live.altcoinChange24h).tone;

  return nodes.map((node) => {
    if (node.id === "usd" && live.dxyValue !== undefined) {
      const dxyTone: TrendTone = (live.dxyChangePct ?? 0) > 0.1 ? "down" : (live.dxyChangePct ?? 0) < -0.1 ? "up" : "neutral";
      // Tone is framed from crypto's perspective: USD strength = headwind (down tone) for risk assets.
      return {
        ...node,
        tone: dxyTone,
        metrics: [
          { label: "DXY Index", value: live.dxyValue.toFixed(2), tone: dxyTone },
          {
            label: "Dollar Strength",
            value: (live.dxyChangePct ?? 0) > 0.1 ? "Menguat" : (live.dxyChangePct ?? 0) < -0.1 ? "Melemah" : "Netral",
            tone: dxyTone,
          },
          {
            label: "Liquidity Impact",
            value: (live.dxyChangePct ?? 0) > 0.1 ? "Tekanan ke crypto" : (live.dxyChangePct ?? 0) < -0.1 ? "Mendukung crypto" : "Netral",
            tone: dxyTone,
          },
        ],
      };
    }

    if (node.id === "crypto") {
      return {
        ...node,
        tone: cryptoTone,
        summary:
          live.totalMarketCapChange24h !== undefined
            ? `Total kapitalisasi pasar crypto ${live.totalMarketCapChange24h >= 0 ? "naik" : "turun"} ${fmtPct(
                Math.abs(live.totalMarketCapChange24h)
              )} dalam 24 jam terakhir.`
            : node.summary,
        metrics: [
          { label: "Total Market Cap", value: fmtUsdShort(live.totalMarketCapUsd) ?? "—", tone: cryptoTone },
          { label: "24h Change", value: fmtPct(live.totalMarketCapChange24h) ?? "—", tone: cryptoTone },
          { label: "BTC Dominance", value: live.btcDominance !== undefined ? `${live.btcDominance.toFixed(1)}%` : "—" },
        ],
      };
    }

    if (node.id === "btc") {
      return {
        ...node,
        tone: btcTrend.tone,
        summary: live.btcPrice !== undefined ? `BTC diperdagangkan di ${fmtUsdShort(live.btcPrice)}, struktur ${btcTrend.label.toLowerCase()}.` : node.summary,
        metrics: [
          { label: "Trend", value: btcTrend.label, tone: btcTrend.tone },
          {
            label: "Market Structure",
            value: btcTrend.tone === "up" ? "Higher-high / Higher-low" : btcTrend.tone === "down" ? "Lower-high / Lower-low" : "Konsolidasi",
            tone: btcTrend.tone,
          },
          { label: "Institutional Flow", value: "Lihat panel Institutional Flow", tone: "neutral", sample: true },
        ],
      };
    }

    if (node.id === "eth") {
      return {
        ...node,
        tone: ethTrend.tone,
        summary: live.ethPrice !== undefined ? `ETH diperdagangkan di ${fmtUsdShort(live.ethPrice)}, struktur ${ethTrend.label.toLowerCase()}.` : node.summary,
        metrics: [
          { label: "Trend", value: ethTrend.label, tone: ethTrend.tone },
          {
            label: "ETH/BTC Ratio",
            value:
              live.ethChange24h !== undefined && live.btcChange24h !== undefined
                ? live.ethChange24h >= live.btcChange24h
                  ? "Menguat vs BTC"
                  : "Melemah vs BTC"
                : "—",
            sample: true,
          },
          { label: "L2 & Staking Activity", value: "Stabil", sample: true },
        ],
      };
    }

    if (node.id === "altcoin") {
      return {
        ...node,
        tone: altTone,
        summary:
          live.btcDominance !== undefined
            ? `BTC dominance ${live.btcDominance.toFixed(1)}% — ${live.btcDominance < 50 ? "kondisi mendukung rotasi ke altcoin." : "likuiditas masih terpusat di BTC."}`
            : node.summary,
        metrics: [
          { label: "Market Cap", value: fmtUsdShort(live.altcoinMarketCapUsd) ?? "—", tone: altTone },
          { label: "Sector Rotation", value: live.topSectorLabel ?? "—", tone: "neutral" },
          { label: "Momentum", value: deriveTrend(live.altcoinChange24h, live.altcoinChange24h).label, tone: altTone },
        ],
      };
    }

    return node;
  });
}
