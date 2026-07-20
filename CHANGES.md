# ElStand AI — Market Intelligence Dashboard: apa yang berubah

## V2.1 — Animasi flow di garis penghubung

- Garis di `GlobalIntelligenceMap` sekarang solid + glow (bukan dash
  "marching ants" lagi), dengan **3 partikel/bubble kecil yang mengalir
  terus-menerus** di sepanjang tiap garis (pakai SVG `animateMotion` +
  `mpath` native — tanpa dependency tambahan), meniru efek "liquidity
  mengalir" seperti referensi. Garis/node aktif (hover/klik) dapat partikel
  lebih besar, lebih terang, lebih cepat; garis idle tetap mengalir pelan
  supaya peta terasa hidup terus, bukan cuma saat disentuh.
- Menghormati `prefers-reduced-motion`: kalau user mengaktifkan itu di OS,
  partikel tidak dirender (garis tetap terlihat, cuma tanpa gerakan).
- Tidak menambahkan angka $ di garis (seperti di beberapa referensi) karena
  itu akan jadi data fiktif untuk hubungan macro→crypto yang sifatnya
  kausal, bukan aliran dana yang terukur — konsisten dengan aturan
  "no dummy data" dari brief sebelumnya.

## V2 — Global Intelligence Map rebuild

Fokus V2: peta jadi sistem real-time interaktif, bukan tampilan statis.

### Baru

- **`lib/intelligence/globalSentiment.ts`** — mesin AI reasoning. Membaca
  semua sinyal yang tersedia (Fear & Greed, market cap, DXY, Gold, Stocks,
  struktur BTC, momentum altcoin, event makro yang akan datang) dan
  menghasilkan **Risk On / Risk Off / Neutral / Transition** + confidence
  score 0–100 + daftar alasan. Dipakai bersama oleh Market Status card
  (Top Market Overview) dan header peta, jadi keduanya tidak pernah
  berbeda pendapat.
- **`lib/intelligence/sources/`** — integrasi API baru, masing-masing
  gated di belakang env var, `cached()`, dan fallback `undefined` yang
  graceful persis pola `lib/macro.ts`:
  - `twelvedata.ts` + `usd.ts` + `gold.ts` — DXY & XAU/USD via TwelveData,
    termasuk time-series untuk sparkline. Perlu `TWELVEDATA_API_KEY`.
  - `stocks.ts` — Nasdaq/S&P500/Dow Jones via Finnhub, pakai proxy ETF
    (QQQ/SPY/DIA) karena ticker indeks asli butuh paid add-on di Finnhub.
    Perlu `FINNHUB_API_KEY`.
  - `cryptoNews.ts` — berita crypto via CryptoPanic, fallback ke feed
    NewsAPI yang sudah ada kalau key tidak diisi. Opsional,
    `CRYPTOPANIC_API_KEY`.
- **`lib/intelligence/macroEvents.ts`** — mengkategorikan kalender makro
  yang sudah ada (gratis, ForexFactory) ke FOMC/CPI/PPI/NFP/PMI/Interest
  Rate sesuai spec, plus deteksi event high-impact yang akan datang untuk
  reasoning engine. Tidak menambah dependency baru.
- **`components/intelligence/ui/NodeDrawer.tsx`** — drawer modern: side
  panel di desktop, bottom sheet di mobile, dengan animasi slide + spring
  yang sesuai arah layout masing-masing.
- **`components/intelligence/ui/Sparkline.tsx`** — mini chart SVG ringan
  untuk node USD/Gold, tanpa dependency tambahan.

### Diubah total

- **`lib/intelligence/marketMap.ts`** — model data ditulis ulang. Setiap
  node sekarang punya `connected: boolean` (bukan `sample`) dan `sections`
  (list/stats/chart/text) yang generic — menambah node baru (Whale, Order
  Flow, Footprint, Liquidity Heatmap) di versi berikutnya tinggal menulis
  satu `buildXNode()` lagi, tidak perlu ubah tree, drawer, atau garis
  penghubung.
- **`components/intelligence/GlobalIntelligenceMap.tsx`** — header Global
  Sentiment (status + confidence + alasan) selalu tampil tanpa perlu klik;
  klik node membuka `NodeDrawer` (bukan panel inline di bawah peta seperti
  V1); semua garis penghubung sekarang berdenyut terus-menerus (lebih
  cepat & terang saat sebuah node di-hover/aktif, pelan & redup saat idle)
  supaya terasa hidup, bukan statis.
- **Tidak ada lagi label "Contoh"** di mana pun. Data yang belum terhubung
  ke API sekarang tampil sebagai **"Waiting for API Connection"** —
  termasuk di Institutional Flow (ETF Flow & Institutional Movement kini
  benar-benar kosong dengan status waiting, bukan angka contoh) dan
  Sector Rotation.

### Belum ada sumber gratis (tampil "Waiting for API Connection", bukan angka fiktif)

- **ETF Flow & Institutional Movement** — tidak ada API gratis tanpa key
  untuk data ini; lihat komentar di `lib/intelligence/institutionalFlow.ts`
  untuk opsi (Farside Investors, SoSoValue, atau vendor berbayar).
- **Large BTC Transaction on-chain** — feed whale (`lib/alchemy.ts`) hanya
  memantau token ERC-20, bukan BTC asli.

---

## V1 — Dashboard utama (struktur awal)

Semua di bawah ini ditambahkan untuk membangun `/dashboard` pertama kali
sesuai struktur awal yang diminta (Top Market Overview, Whale & Liquidity,
Institutional Flow, Sector Rotation, AI Summary, Altcoin Scanner). Tidak
ada file lama dari project asli yang dihapus.

- `lib/intelligence/shared.ts`, `sectorRotation.ts`, `whaleLiquidity.ts`,
  `altcoinScanner.ts` — helper rule-based dan taksonomi sektor bersama.
- `components/intelligence/TopMarketOverview.tsx`,
  `WhaleLiquidityPanel.tsx`, `InstitutionalFlowPanel.tsx`,
  `SectorRotationHeatmap.tsx`, `AltcoinScannerTable.tsx`,
  `MarketStatusBadge.tsx`.
- `app/dashboard/page.tsx` disusun ulang mengikuti urutan brief. AI Signal,
  Paper Trader, Token Scanner lengkap, dan chat tetap ada — dipindah ke
  baris "Lainnya dari ElStand AI" + sidebar/menu, bukan dihapus.
