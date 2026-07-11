import type {
  CoinMarket,
  PumpCandidate,
  RugpullRisk,
  FundingInfo,
  WhaleTransfer,
  NewsItem,
} from "./types";
import { formatUsd, formatPct, timeAgo } from "./format";

export interface AnalystContext {
  markets: CoinMarket[];
  pumpCandidates: PumpCandidate[];
  rugpullRisks: RugpullRisk[];
  funding: FundingInfo[];
  whales: WhaleTransfer[];
  news: NewsItem[];
  fearGreed?: { value: number; classification: string };
}

// ---------- helpers ----------

function findCoinFromMessage(message: string, markets: CoinMarket[]): CoinMarket | undefined {
  const dollar = message.match(/\$([a-zA-Z0-9]{2,15})/);
  const candidates: string[] = [];
  if (dollar) candidates.push(dollar[1]);
  candidates.push(...message.split(/[^a-zA-Z0-9]+/).filter(Boolean));

  for (const c of candidates) {
    const cl = c.toLowerCase();
    const bySymbol = markets.find((m) => m.symbol.toLowerCase() === cl);
    if (bySymbol) return bySymbol;
  }
  for (const c of candidates) {
    const cl = c.toLowerCase();
    if (cl.length < 3) continue;
    const byName = markets.find(
      (m) => m.name.toLowerCase() === cl || m.name.toLowerCase().replace(/\s+/g, "") === cl
    );
    if (byName) return byName;
  }
  return undefined;
}

function fundingFor(symbol: string, funding: FundingInfo[]): FundingInfo | undefined {
  const target = `${symbol.toUpperCase()}USDT`;
  return funding.find((f) => f.symbol === target);
}

function whalesFor(symbol: string, whales: WhaleTransfer[]): WhaleTransfer[] {
  return whales.filter((w) => w.asset.toLowerCase() === symbol.toLowerCase());
}

function newsFor(symbol: string, name: string, news: NewsItem[]): NewsItem[] {
  const sym = symbol.toLowerCase();
  const nm = name.toLowerCase();
  return news.filter((n) => {
    const t = n.title.toLowerCase();
    return t.includes(sym) || t.includes(nm);
  });
}

// ---------- per-coin report ----------

function analyzeCoin(coin: CoinMarket, ctx: AnalystContext): string {
  const symbol = coin.symbol.toUpperCase();
  const pump = ctx.pumpCandidates.find((c) => c.id === coin.id);
  const risk = ctx.rugpullRisks.find((r) => r.symbol.toUpperCase() === symbol);
  const funding = fundingFor(symbol, ctx.funding);
  const whaleHits = whalesFor(symbol, ctx.whales);
  const newsHits = newsFor(symbol, coin.name, ctx.news);

  const chg24 = coin.price_change_percentage_24h_in_currency ?? 0;
  const pumpScore = pump?.score ?? 0;
  const riskScore = risk?.score ?? 0;

  const lines: string[] = [];
  lines.push(`${symbol} Analysis`);
  lines.push("");

  // Market Summary
  lines.push("📊 Market Summary");
  lines.push(
    `Harga saat ini ${formatUsd(coin.current_price)}, ${chg24 >= 0 ? "naik" : "turun"} ${formatPct(chg24)} dalam 24 jam. Market cap ${formatUsd(
      coin.market_cap
    )}, volume 24h ${formatUsd(coin.total_volume)}.`
  );
  lines.push("");

  // Whale Activity
  lines.push("🐋 Whale Activity");
  if (whaleHits.length > 0) {
    const total = whaleHits.reduce((sum, w) => sum + w.valueUsd, 0);
    lines.push(
      `Terdeteksi ${whaleHits.length} transfer besar senilai total ${formatUsd(total)} (transfer terbaru ${timeAgo(
        whaleHits[0].timestamp
      )}).`
    );
  } else {
    lines.push("Belum ada transfer whale signifikan (>$250k) yang terdeteksi untuk token ini saat ini.");
  }
  lines.push("");

  // Momentum
  lines.push("📈 Momentum");
  lines.push(`Pump Score: ${pumpScore}/100${pump ? ` — ${pump.reasons.join(", ")}` : " — belum ada sinyal momentum yang kuat"}.`);
  if (funding) {
    const fundingPct = (funding.lastFundingRate * 100).toFixed(4);
    lines.push(
      `Funding rate: ${fundingPct}% (${funding.lastFundingRate < 0 ? "negatif — short membayar long" : "positif — long membayar short"})${
        funding.openInterestValue ? `, Open Interest ${formatUsd(funding.openInterestValue)}` : ""
      }.`
    );
  } else {
    lines.push("Tidak ada data futures Binance untuk pair ini (mungkin belum listing di futures, atau di luar watchlist).");
  }
  lines.push("");

  // Risk Analysis
  lines.push("⚠️ Risk Analysis");
  if (risk) {
    lines.push(`Rugpull Risk Score: ${riskScore}/100. Flag: ${risk.flags.join(" · ")}.`);
  } else {
    lines.push("Tidak ada red flag rugpull signifikan yang terdeteksi dari data on-chain saat ini — tetap lakukan riset sendiri (DYOR).");
  }
  lines.push("");

  // News Impact
  if (newsHits.length > 0) {
    lines.push("📰 News Impact");
    for (const n of newsHits.slice(0, 3)) {
      lines.push(`- ${n.title} (${n.source}, ${timeAgo(n.publishedAt)})`);
    }
    lines.push("");
  }

  // Conclusion
  lines.push("💡 Kesimpulan");
  lines.push(buildConclusion(pumpScore, riskScore, funding));
  lines.push("");
  lines.push("Catatan: ini sinyal berbasis data publik, bukan prediksi harga dan bukan saran finansial.");

  return lines.join("\n");
}

function buildConclusion(pumpScore: number, riskScore: number, funding?: FundingInfo): string {
  if (riskScore >= 60) {
    return "Risiko rugpull tergolong tinggi berdasarkan data on-chain. Momentum harga tidak sepadan dengan risiko likuiditas ini — sangat disarankan untuk berhati-hati dan verifikasi ulang sebelum entry.";
  }
  if (pumpScore >= 70 && riskScore < 40) {
    return "Momentum kuat terbentuk dengan risiko yang relatif terkendali. Tetap tunggu konfirmasi teknikal (breakout dari resistance) sebelum mempertimbangkan entry, dan gunakan position sizing yang wajar.";
  }
  if (pumpScore >= 40) {
    return "Ada sinyal momentum awal, tapi belum cukup kuat untuk kesimpulan tegas. Pantau terus perkembangan volume dan whale flow beberapa jam ke depan.";
  }
  if (funding && funding.lastFundingRate < -0.0005) {
    return "Momentum harga belum terlihat jelas, tapi funding negatif menunjukkan sentimen short yang crowded — berpotensi jadi bahan bakar short squeeze jika ada katalis.";
  }
  return "Belum ada sinyal pump yang signifikan saat ini berdasarkan data yang tersedia. Cocok untuk dipantau, bukan untuk buru-buru entry.";
}

// ---------- general (non-coin-specific) intents ----------

function whaleOverview(ctx: AnalystContext): string {
  if (!ctx.whales.length) {
    return "🐋 Whale Activity\n\nBelum ada transfer whale besar (>$250k) yang terdeteksi dalam scan terakhir.";
  }
  const lines = ["🐋 Whale Activity — transfer terbesar saat ini:", ""];
  for (const w of ctx.whales.slice(0, 5)) {
    lines.push(`- ${w.asset}: ${formatUsd(w.valueUsd)} (${timeAgo(w.timestamp)})`);
  }
  return lines.join("\n");
}

function rugpullOverview(ctx: AnalystContext): string {
  if (!ctx.rugpullRisks.length) {
    return "⚠️ Risk Analysis\n\nTidak ada pool yang melewati ambang batas risiko saat ini.";
  }
  const lines = ["⚠️ Top Rugpull Risk saat ini:", ""];
  for (const r of ctx.rugpullRisks.slice(0, 5)) {
    lines.push(`- ${r.symbol} (${r.network}): skor ${r.score}/100 — ${r.flags[0] ?? ""}`);
  }
  return lines.join("\n");
}

function fearGreedOverview(ctx: AnalystContext): string {
  if (!ctx.fearGreed) return "📊 Data Fear & Greed sedang tidak tersedia.";
  return `📊 Fear & Greed Index: ${ctx.fearGreed.value}/100 (${ctx.fearGreed.classification}).\n\n${
    ctx.fearGreed.value <= 25
      ? "Pasar dalam kondisi Extreme Fear — historisnya ini sering jadi area akumulasi, tapi juga bisa berlanjut turun. Bukan sinyal beli otomatis."
      : ctx.fearGreed.value >= 75
      ? "Pasar dalam kondisi Extreme Greed — biasanya saat euforia tinggi, risiko koreksi juga meningkat."
      : "Sentimen pasar netral, tidak ada bias ekstrem ke arah manapun."
  }`;
}

function marketSummary(ctx: AnalystContext): string {
  const btc = ctx.markets.find((m) => m.symbol === "btc");
  const lines = ["📊 Market Summary", ""];
  if (btc) {
    lines.push(
      `BTC: ${formatUsd(btc.current_price)} (${formatPct(btc.price_change_percentage_24h_in_currency ?? 0)} 24h)`
    );
  }
  if (ctx.fearGreed) {
    lines.push(`Fear & Greed: ${ctx.fearGreed.value} (${ctx.fearGreed.classification})`);
  }
  lines.push("");
  lines.push(`📈 Top Pump Candidates: ${ctx.pumpCandidates.slice(0, 3).map((c) => `${c.symbol} (${c.score})`).join(", ") || "-"}`);
  lines.push(`⚠️ Top Rugpull Risk: ${ctx.rugpullRisks.slice(0, 3).map((r) => `${r.symbol} (${r.score})`).join(", ") || "-"}`);
  return lines.join("\n");
}

// ---------- main entry ----------

export function generateAnalysis(message: string, ctx: AnalystContext): string {
  const m = message.toLowerCase();

  const coin = findCoinFromMessage(message, ctx.markets);
  if (coin) return analyzeCoin(coin, ctx);

  if (/whale/.test(m)) return whaleOverview(ctx);
  if (/rug|risk|risiko/.test(m)) return rugpullOverview(ctx);
  if (/fear|greed|sentimen/.test(m)) return fearGreedOverview(ctx);
  if (/market|summary|overview|ringkasan/.test(m)) return marketSummary(ctx);

  return [
    "Saya bisa bantu analisa:",
    "- Ketik nama/ticker coin, contoh: \"VIRTUAL\" atau \"analisa PEPE\"",
    "- \"whale activity\" untuk lihat transfer whale terbesar",
    "- \"rugpull risk\" untuk lihat token paling berisiko",
    "- \"fear and greed\" untuk sentimen pasar",
    "- \"market summary\" untuk ringkasan umum",
  ].join("\n");
}
