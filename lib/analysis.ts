import { formatUsd, formatPct, timeAgo } from "./format";
import { nextEvent } from "./economiccalendar";
import type { NoctrunSnapshot } from "./snapshot";
import type { CoinMarket, WhaleTransfer, NewsItem } from "./types";

// ---------------------------------------------------------------------------
// Nocturn is not a price oracle. Every line below is derived from the live
// snapshot (Fear & Greed, whale flow, funding/OI, pump & rugpull scores,
// news, economic calendar) with plain rule-based logic — no model call, no
// hallucinated numbers, no API cost. That's the whole point: it stays free
// and it stays honest about what it does and doesn't know.
// ---------------------------------------------------------------------------

function pumpEmoji(score: number) {
  if (score >= 70) return "🟢";
  if (score >= 40) return "🟡";
  return "🔴";
}

function riskEmoji(score: number) {
  if (score >= 60) return "🔴";
  if (score >= 30) return "🟡";
  return "🟢";
}

function findMarket(markets: CoinMarket[], query: string): CoinMarket | undefined {
  const q = query.trim().toLowerCase();
  return (
    markets.find((m) => m.symbol.toLowerCase() === q) ??
    markets.find((m) => m.name.toLowerCase() === q) ??
    markets.find((m) => m.name.toLowerCase().includes(q) && q.length >= 3)
  );
}

/** Pulls a candidate ticker out of free-text, e.g. "analisa ALLO dong" -> "ALLO". */
export function extractSymbolQuery(message: string, markets: CoinMarket[]): string | undefined {
  const words = message.match(/[a-zA-Z0-9]{2,15}/g) ?? [];
  const stop = new Set([
    "analisa", "analisis", "analysis", "tolong", "coba", "gimana", "bagaimana",
    "apakah", "apa", "dong", "yuk", "market", "crypto", "coin", "token", "the",
    "harga", "price", "of", "for", "about", "risk", "risiko", "whale", "news",
    "momentum", "pump", "rug", "rugpull", "summary", "kesimpulan", "conclusion",
  ]);
  for (const w of words) {
    const lw = w.toLowerCase();
    if (stop.has(lw)) continue;
    if (findMarket(markets, lw)) return lw;
  }
  return undefined;
}

function whaleFlowFor(symbol: string, whales: WhaleTransfer[]) {
  const matches = whales.filter((w) => w.asset.toLowerCase() === symbol.toLowerCase());
  const total = matches.reduce((sum, w) => sum + w.valueUsd, 0);
  return { matches, total };
}

function newsFor(symbol: string, name: string, news: NewsItem[]) {
  const s = symbol.toLowerCase();
  const n = name.toLowerCase();
  return news.filter((item) => {
    const t = item.title.toLowerCase();
    return t.includes(s) || (n.length > 2 && t.includes(n));
  });
}

function supportResistance(market: CoinMarket) {
  const points = market.sparkline_in_7d?.price ?? [];
  if (points.length < 2) return undefined;
  const high = Math.max(...points);
  const low = Math.min(...points);
  return { high, low };
}

// ---------------------------------------------------------------------------
// Per-coin report, in the 6-section Nocturn format.
// ---------------------------------------------------------------------------
export function analyzeCoin(query: string, snap: NoctrunSnapshot): string {
  const market = findMarket(snap.markets, query);
  if (!market) {
    return `Aku tidak menemukan "${query}" di 150 coin teratas yang Nocturn pantau saat ini. Coba simbol lain, atau tanya soal market secara umum, whale activity, atau risk.`;
  }

  const symbol = market.symbol.toUpperCase();
  const pump = snap.pumpCandidates.find((c) => c.symbol === symbol);
  const risk = snap.rugpullRisks.find((r) => r.symbol === symbol);
  const { matches: whaleMatches, total: whaleTotal } = whaleFlowFor(market.symbol, snap.whales);
  const funding = snap.funding.find((f) => f.symbol.toUpperCase() === `${symbol}USDT`);
  const sr = supportResistance(market);
  const news = newsFor(market.symbol, market.name, snap.news);
  const score = pump?.score ?? 0;

  const lines: string[] = [];
  lines.push(`## ${market.name} (${symbol}) Analysis`);
  lines.push("");

  // 📊 Market Summary
  lines.push("📊 **Market Summary**");
  lines.push(
    `${symbol} sedang di ${formatUsd(market.current_price)} (${formatPct(market.price_change_percentage_24h_in_currency ?? 0)} 24h). ` +
      `Market cap ${formatUsd(market.market_cap)} (rank #${market.market_cap_rank}), volume 24h ${formatUsd(market.total_volume)}.`
  );
  lines.push("");

  // 🐋 Whale Activity
  lines.push("🐋 **Whale Activity**");
  if (whaleMatches.length) {
    lines.push(`Whale membeli/memindahkan total ${formatUsd(whaleTotal)} dalam 24 jam terakhir (${whaleMatches.length} transaksi besar terdeteksi).`);
  } else {
    lines.push("Tidak ada transfer whale besar yang terdeteksi untuk token ini dalam feed saat ini.");
  }
  lines.push("");

  // ⚠️ Risk Analysis
  lines.push("⚠️ **Risk Analysis**");
  if (risk) {
    lines.push(`${riskEmoji(risk.score)} Rugpull score ${risk.score}/100. Flag: ${risk.flags.slice(0, 3).join("; ") || "-"}.`);
  } else {
    lines.push("Tidak ada sinyal rugpull-risk yang terdeteksi dari data DEX saat ini (bukan jaminan aman — tetap DYOR).");
  }
  lines.push("");

  // 📈 Momentum
  lines.push("📈 **Momentum**");
  const momentumBits: string[] = [`${pumpEmoji(score)} Pump Score: ${score}/100`];
  if (pump?.reasons.length) momentumBits.push(...pump.reasons);
  if (funding) {
    momentumBits.push(
      `Funding rate ${(funding.lastFundingRate * 100).toFixed(4)}% (${funding.lastFundingRate < 0 ? "negatif — short bayar long" : "positif"})`
    );
    if (funding.openInterestValue) momentumBits.push(`Open Interest ${formatUsd(funding.openInterestValue)}`);
  }
  if (sr) {
    momentumBits.push(`Resistance ~${formatUsd(sr.high)} (7d high), support ~${formatUsd(sr.low)} (7d low)`);
  }
  lines.push(momentumBits.join(". ") + ".");
  lines.push("");

  // 📰 News Impact
  lines.push("📰 **News Impact**");
  if (news.length) {
    for (const n of news.slice(0, 3)) {
      lines.push(`- [${n.sentiment ?? "neutral"}] ${n.title} (${n.source}, ${timeAgo(n.publishedAt)})`);
    }
  } else {
    lines.push("Tidak ada berita spesifik yang menyebut token ini dalam feed terbaru.");
  }
  lines.push("");

  // 💡 Final Conclusion
  lines.push("💡 **Final Conclusion**");
  lines.push(buildConclusion({ score, riskScore: risk?.score, funding, sr, market, whaleTotal }));

  return lines.join("\n");
}

function buildConclusion(args: {
  score: number;
  riskScore?: number;
  funding?: { lastFundingRate: number };
  sr?: { high: number; low: number };
  market: CoinMarket;
  whaleTotal: number;
}): string {
  const { score, riskScore, funding, sr, market, whaleTotal } = args;
  const bullish = score >= 60;
  const bearishRisk = (riskScore ?? 0) >= 60;
  const nearResistance = sr ? market.current_price >= sr.high * 0.97 : false;

  if (bearishRisk) {
    return "Sinyal risiko cukup tinggi — prioritaskan verifikasi kontrak, likuiditas, dan tim sebelum mempertimbangkan entry apa pun.";
  }
  if (bullish && whaleTotal > 100_000) {
    return `Momentum bullish mulai terbentuk didukung akumulasi whale${
      nearResistance ? ", tetapi harga sudah mendekati resistance — tunggu konfirmasi breakout" : ""
    }. Bukan sinyal beli otomatis — cek konfirmasi volume sebelum entry.`;
  }
  if (bullish) {
    return "Skor momentum cukup kuat, tapi belum didukung whale flow yang signifikan — tunggu konfirmasi tambahan sebelum entry.";
  }
  if ((funding?.lastFundingRate ?? 0) < -0.0005) {
    return "Funding negatif menandakan short crowded — berpotensi short-squeeze, tapi belum ada konfirmasi momentum kuat. Pantau dulu.";
  }
  return "Belum ada sinyal kuat ke satu arah saat ini. Data ini adalah bahan pertimbangan, bukan rekomendasi — selalu verifikasi mandiri sebelum ambil posisi.";
}

// ---------------------------------------------------------------------------
// Market-wide report (no specific coin named).
// ---------------------------------------------------------------------------
export function generateMarketSummary(snap: NoctrunSnapshot): string {
  const { markets, global, fng, pumpCandidates, rugpullRisks, whales, news, calendar } = snap;
  const btc = markets.find((m) => m.symbol === "btc");
  const upcoming = nextEvent(calendar);
  const whale24h = whales.reduce((s, w) => s + w.valueUsd, 0);
  const negNews = news.filter((n) => n.sentiment === "negative").length;
  const posNews = news.filter((n) => n.sentiment === "positive").length;

  const lines: string[] = [];
  lines.push("## Nocturn Market Snapshot");
  lines.push("");

  lines.push("📊 **Market Summary**");
  lines.push(
    `${global ? `Total market cap ${formatUsd(global.total_market_cap.usd)} (${formatPct(global.market_cap_change_percentage_24h_usd)} 24h), BTC dominance ${global.market_cap_percentage.btc.toFixed(1)}%. ` : ""}` +
      `${btc ? `BTC di ${formatUsd(btc.current_price)} (${formatPct(btc.price_change_percentage_24h_in_currency ?? 0)} 24h).` : ""}`
  );
  lines.push("");

  lines.push("🐋 **Whale Activity**");
  lines.push(
    whales.length
      ? `Total ${formatUsd(whale24h)} dalam ${whales.length} transfer besar terdeteksi lintas watchlist dalam 24 jam terakhir.`
      : "Tidak ada transfer whale signifikan yang terdeteksi saat ini."
  );
  lines.push("");

  lines.push("⚠️ **Risk Analysis**");
  if (rugpullRisks.length) {
    const top = rugpullRisks.slice(0, 3).map((r) => `${r.symbol} (${r.score}/100)`).join(", ");
    lines.push(`${rugpullRisks.length} token DEX menunjukkan sinyal risiko. Tertinggi: ${top}.`);
  } else {
    lines.push("Tidak ada token dengan skor rugpull-risk tinggi yang terdeteksi saat ini.");
  }
  lines.push("");

  lines.push("📈 **Momentum**");
  if (pumpCandidates.length) {
    const top = pumpCandidates.slice(0, 3).map((c) => `${pumpEmoji(c.score)} ${c.symbol} (${c.score}/100)`).join(", ");
    lines.push(`Top pump candidates saat ini: ${top}.`);
  } else {
    lines.push("Belum ada kandidat pump yang lolos threshold skor saat ini.");
  }
  if (fng) lines.push(`Fear & Greed Index: ${fng.now.value}/100 (${fng.now.classification}).`);
  lines.push("");

  lines.push("📰 **News Impact**");
  lines.push(
    news.length
      ? `${news.length} berita terpantau (${posNews} positif, ${negNews} negatif).${
          upcoming ? ` Event ekonomi berikutnya: ${upcoming.title} (${upcoming.country}, ${timeAgo(upcoming.date)}).` : ""
        }`
      : `Tidak ada feed berita aktif saat ini.${upcoming ? ` Event ekonomi berikutnya: ${upcoming.title} (${upcoming.country}).` : ""}`
  );
  lines.push("");

  lines.push("💡 **Final Conclusion**");
  lines.push(buildMarketConclusion(fng?.now.value, negNews, pumpCandidates.length));

  return lines.join("\n");
}

function buildMarketConclusion(fngValue: number | undefined, negNews: number, pumpCount: number): string {
  if (fngValue !== undefined && fngValue <= 25) {
    return "Sentimen pasar berada di zona Extreme Fear — historis sering jadi area akumulasi, tapi juga bisa berlanjut turun. Kelola risiko, jangan all-in.";
  }
  if (fngValue !== undefined && fngValue >= 75) {
    return "Sentimen pasar di zona Extreme Greed — waspada koreksi, pertimbangkan take-profit bertahap daripada mengejar FOMO.";
  }
  if (negNews > 3) {
    return "Volume berita negatif cukup tinggi hari ini — cek dulu sumbernya sebelum ambil keputusan, sentimen bisa bias sesaat.";
  }
  if (pumpCount > 5) {
    return "Cukup banyak kandidat momentum hari ini — screening lebih lanjut per-coin disarankan sebelum entry mana pun.";
  }
  return "Kondisi pasar relatif netral saat ini. Data ini adalah bahan pertimbangan, bukan rekomendasi — selalu verifikasi mandiri.";
}

// ---------------------------------------------------------------------------
// Focused single-section answers (when the user asks about just one thing).
// ---------------------------------------------------------------------------
export function generateWhaleReport(snap: NoctrunSnapshot): string {
  if (!snap.whales.length) return "🐋 Tidak ada transfer whale besar yang terdeteksi saat ini di watchlist.";
  const lines = ["🐋 **Whale Activity — 24h**", ""];
  for (const w of snap.whales.slice(0, 8)) {
    lines.push(`- ${w.asset}: ${formatUsd(w.valueUsd)} (${timeAgo(w.timestamp)})`);
  }
  return lines.join("\n");
}

export function generateRiskReport(snap: NoctrunSnapshot): string {
  if (!snap.rugpullRisks.length) return "⚠️ Tidak ada token dengan skor rugpull-risk tinggi terdeteksi saat ini.";
  const lines = ["⚠️ **Risk Analysis — Top Flags**", ""];
  for (const r of snap.rugpullRisks.slice(0, 8)) {
    lines.push(`- ${riskEmoji(r.score)} ${r.symbol} (${r.score}/100): ${r.flags.slice(0, 2).join("; ") || "-"}`);
  }
  return lines.join("\n");
}

export function generateMomentumReport(snap: NoctrunSnapshot): string {
  if (!snap.pumpCandidates.length) return "📈 Belum ada kandidat momentum yang lolos threshold skor saat ini.";
  const lines = ["📈 **Momentum — Top Pump Candidates**", ""];
  for (const c of snap.pumpCandidates.slice(0, 8)) {
    lines.push(`- ${pumpEmoji(c.score)} ${c.symbol} (${c.score}/100): ${c.reasons.slice(0, 2).join("; ") || "-"}`);
  }
  return lines.join("\n");
}

export function generateNewsReport(snap: NoctrunSnapshot): string {
  if (!snap.news.length) return "📰 Tidak ada feed berita aktif saat ini (NEWSAPI_KEY belum di-set, atau rate limit).";
  const lines = ["📰 **News Impact — Latest**", ""];
  for (const n of snap.news.slice(0, 8)) {
    lines.push(`- [${n.sentiment ?? "neutral"}] ${n.title} — ${n.source} (${timeAgo(n.publishedAt)})`);
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Router: decide what the user is actually asking for.
// ---------------------------------------------------------------------------
export function routeMessage(message: string, snap: NoctrunSnapshot): string {
  const m = message.toLowerCase().trim();

  if (/^(hi|halo|hai|hey|hello|p)\b/.test(m) || m.length < 3) {
    return (
      "Halo! Aku Nocturn AI — Crypto Intelligence Engine, 100% gratis dan berjalan dari data live (Fear & Greed, whale flow, " +
      "funding/OI, pump score, rugpull risk, news, economic calendar).\n\nCoba tanya:\n- \"analisa ALLO\" (atau simbol lain)\n" +
      "- \"whale activity hari ini\"\n- \"risk tertinggi apa\"\n- \"momentum sekarang\"\n- \"berita terbaru\"\n- \"ringkasan market\""
    );
  }

  const symbolQuery = extractSymbolQuery(message, snap.markets);
  if (symbolQuery) return analyzeCoin(symbolQuery, snap);

  if (/whale/.test(m)) return generateWhaleReport(snap);
  if (/rug|risk|risiko/.test(m)) return generateRiskReport(snap);
  if (/momentum|pump/.test(m)) return generateMomentumReport(snap);
  if (/news|berita/.test(m)) return generateNewsReport(snap);

  return generateMarketSummary(snap);
}
