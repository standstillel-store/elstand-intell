# ElStand AI — Market Intelligence Dashboard: apa yang berubah

Semua di bawah ini baru ditambahkan atau diubah untuk membangun ulang
`/dashboard` sesuai struktur yang diminta. Tidak ada file lama yang dihapus.

## File baru

**`lib/intelligence/`** — logika data, terpisah dari komponen tampilan:
- `shared.ts` — helper rule-based bersama (deriveTrend, deriveMarketStatus,
  taksonomi sector AI/RWA/DeFi/Gaming/Layer1/Layer2).
- `marketMap.ts` — model data + 9 node untuk Global Intelligence Map.
- `sectorRotation.ts` — agregasi Sector Rotation, real dari `markets` live.
- `institutionalFlow.ts` — ETF Flow & Institutional Movement (data contoh).
- `whaleLiquidity.ts` — Whale Tracker & Liquidity, real dari data yang sudah ada.
- `altcoinScanner.ts` — baris tabel Altcoin Scanner, real dari `markets` live.

**`components/intelligence/`** — komponen tampilan:
- `TopMarketOverview.tsx`, `GlobalIntelligenceMap.tsx` (komponen utama/baru),
  `WhaleLiquidityPanel.tsx`, `InstitutionalFlowPanel.tsx`,
  `SectorRotationHeatmap.tsx`, `AltcoinScannerTable.tsx`, `MarketStatusBadge.tsx`.

## File yang diubah

- **`app/dashboard/page.tsx`** — disusun ulang total mengikuti urutan brief:
  Top Market Overview → Global Intelligence Map → Whale & Liquidity →
  Institutional Flow → Sector Rotation → AI Summary (`AISummaryCard` lama,
  dipakai ulang apa adanya) → Altcoin Scanner → quick links. Layout mobile
  dan desktop kini satu struktur responsif yang sama (sebelumnya ada dua
  layout terpisah, `MobileHome` vs desktop). AI Signal, Paper Trader, Token
  Scanner lengkap, dan chat tetap ada — dipindah ke baris "Lainnya dari
  ElStand AI" di bagian bawah + sidebar/menu, bukan dihapus.
- **`tailwind.config.ts`** — tambah 1 keyframe/animation (`dashFlow`) untuk
  animasi garis penghubung di peta.

## Yang masih data contoh (jelas ditandai "contoh" di UI)

- **Gold & Stocks** (Nasdaq/S&P500) di peta — belum ada sumber data di
  codebase ini.
- **ETF Flow & Institutional Movement** — belum ada API gratis tanpa key
  yang tersedia; Smart Money Activity di panel yang sama sudah real.
- **Large BTC Transaction / Exchange Inflow-Outflow** — feed whale saat ini
  (`lib/alchemy.ts`) memantau token ERC-20 (WETH, USDT, LINK, dst), bukan BTC
  asli, dan belum menandai alamat exchange secara spesifik.
- **Liquidation Zone / High Liquidity Area** — estimasi heuristik dari mark
  price, bukan data order book. Open Interest & Funding Rate di sebelahnya
  sudah real dari Binance Futures.

Semua bagian di atas otomatis memakai data live begitu sumbernya terhubung —
tidak perlu ubah kode komponen.
