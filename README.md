# NOCTURN INTEL — Crypto Dashboard

## Fitur Live

✅ **Fear & Greed Index** — Real-time sentiment  
✅ **Market Heatmap** — Top 15 coins, harga + 24h %  
✅ **Whale Tracker** — Native transfer (ETH/Polygon/Arbitrum/Optimism/Base) senilai >= $50k, via Alchemy `alchemy_getAssetTransfers` + harga live dari CoinGecko  
✅ **Macro Calendar** — Event ekonomi (CPI, NFP, FOMC, dll) via Financial Modeling Prep, termasuk Actual value begitu event-nya rilis  

## Setup

```bash
# 1. Clone / extract folder
cd nocturn-intel

# 2. Install dependencies
npm install

# 3. Copy .env.local.example → .env.local
cp .env.local.example .env.local

# 4. Run dev server
npm run dev

# 5. Buka browser
# localhost:3000
```

## Environment Variables

Sudah include di `.env.local.example`:
- `ALCHEMY_API_KEY` — **wajib**, dipakai whale tracker. Ambil di https://dashboard.alchemy.com (gratis)
- `FMP_API_KEY` — **wajib**, dipakai macro calendar. Ambil di https://site.financialmodelingprep.com (free tier 250 request/hari)
- `ETHERSCAN_API_KEY` — belum dipakai di kode saat ini, disiapin buat kebutuhan lain

⚠️ **Jangan pernah isi `.env.local.example` dengan key asli** — file itu ditujukan buat di-commit ke git sebagai template. Key asli taruh cuma di `.env.local` (sudah di-gitignore) dan di Vercel → Project Settings → Environment Variables.

## Deploy ke Vercel

```bash
git init
git add .
git commit -m "whale tracker added"
git remote add origin https://github.com/YOUR_USERNAME/nocturn-intel.git
git push -u origin main
```

Terus di vercel.com:
1. Import dari GitHub
2. Add environment variables
3. Deploy

## Struktur Folder

```
app/
├── api/
│   ├── fear-greed/route.ts
│   ├── market/route.ts
│   └── whales/route.ts
├── components/
│   ├── FearGreed.tsx
│   ├── MarketTicker.tsx
│   └── WhaleTracker.tsx
├── page.tsx
└── layout.tsx
```

## Next Steps

- [ ] Tambah news feed
- [ ] Add historical charts
- [ ] Implement alerts
- [ ] Mobile app
