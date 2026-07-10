// Alchemy API - Multi-chain whale tracker
// Support: ETH, Polygon, Arbitrum, Optimism, Base
// "Whale" = native token transfer worth >= WHALE_USD_THRESHOLD (USD), computed live via CoinGecko price.

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;

const WHALE_USD_THRESHOLD = 50_000; // adjust if you want a lower/higher bar
const BLOCK_LOOKBACK = 50_000; // ~roughly last few hours to ~few days depending on chain block time

type ChainConfig = {
  label: string;
  rpc: (key: string) => string;
  priceId: 'ethereum' | 'matic-network'; // which CoinGecko id prices this chain's native gas token
};

const CHAINS: Record<string, ChainConfig> = {
  eth: { label: 'Ethereum', rpc: (k) => `https://eth-mainnet.g.alchemy.com/v2/${k}`, priceId: 'ethereum' },
  polygon: { label: 'Polygon', rpc: (k) => `https://polygon-mainnet.g.alchemy.com/v2/${k}`, priceId: 'matic-network' },
  arbitrum: { label: 'Arbitrum', rpc: (k) => `https://arb-mainnet.g.alchemy.com/v2/${k}`, priceId: 'ethereum' },
  optimism: { label: 'Optimism', rpc: (k) => `https://opt-mainnet.g.alchemy.com/v2/${k}`, priceId: 'ethereum' },
  base: { label: 'Base', rpc: (k) => `https://base-mainnet.g.alchemy.com/v2/${k}`, priceId: 'ethereum' },
};

// Demo whales jika belum ada API key atau nggak ketemu whale activity
const DEMO_WHALES = [
  { hash: '0xabc123def456789abc123def456789abc123def', from: '0x1234567890123456789012345678901234567890', to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', value: '125.5000', usdValue: 251000, chain: 'Ethereum', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  { hash: '0xdef789abc123456def789abc123456def789abc1', from: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', to: '0x1111111111111111111111111111111111111111', value: '87.2500', usdValue: 174500, chain: 'Polygon', timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() },
  { hash: '0x456789def123abc456789def123abc456789def1', from: '0x2222222222222222222222222222222222222222', to: '0x3333333333333333333333333333333333333333', value: '156.0000', usdValue: 312000, chain: 'Arbitrum', timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() },
  { hash: '0x789abc456def123789abc456def123789abc456d', from: '0x4444444444444444444444444444444444444444', to: '0x5555555555555555555555555555555555555555', value: '42.7500', usdValue: 85500, chain: 'Optimism', timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString() },
  { hash: '0xabcdef789abc456abcdef789abc456abcdef789a', from: '0x6666666666666666666666666666666666666666', to: '0x7777777777777777777777777777777777777777', value: '210.0000', usdValue: 420000, chain: 'Base', timestamp: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString() },
];

const CHAIN_LABELS = Object.values(CHAINS).map((c) => c.label);

// Sama seperti route calendar: paksa dynamic biar nggak ke-freeze jadi 1 hasil
// statis waktu build (yang bikin "masih demo mode terus" walau API key udah bener).
export const dynamic = 'force-dynamic';

// Live price buat native token tiap chain (ETH dipakai bareng utk eth/arbitrum/optimism/base krn semua gas-nya ETH)
async function getNativePrices(): Promise<Record<'ethereum' | 'matic-network', number>> {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,matic-network&vs_currencies=usd',
      { next: { revalidate: 60 } }
    );
    const data = await res.json();
    return {
      ethereum: data?.ethereum?.usd || 2000,
      'matic-network': data?.['matic-network']?.usd || 0.5,
    };
  } catch {
    return { ethereum: 2000, 'matic-network': 0.5 };
  }
}

async function getLatestBlock(rpcUrl: string): Promise<number | null> {
  try {
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }),
    });
    const data = await res.json();
    if (!data.result) return null;
    return parseInt(data.result, 16);
  } catch {
    return null;
  }
}

// Fetch native-token whale transfers dari Alchemy dengan AssetTransfers API.
// Return-nya menyertakan `error` per-chain (bukan cuma array kosong) supaya
// GET() bisa kasih tau di UI chain mana yang gagal dan kenapa — misalnya kalau
// network tsb belum di-enable di Alchemy dashboard buat app ini.
async function fetchChainWhales(chainKey: string): Promise<{ transfers: any[]; error: string | null }> {
  const chain = CHAINS[chainKey];
  const rpcUrl = chain.rpc(ALCHEMY_API_KEY!);

  try {
    const latestBlock = await getLatestBlock(rpcUrl);
    const fromBlock = latestBlock
      ? '0x' + Math.max(latestBlock - BLOCK_LOOKBACK, 0).toString(16)
      : '0x0'; // fallback kalau gagal ambil latest block

    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'alchemy_getAssetTransfers',
        params: [
          {
            category: ['external', 'internal'], // native currency transfers only
            fromBlock,
            toBlock: 'latest',
            excludeZeroValue: true,
            order: 'desc',
            maxCount: '0x64', // 100
            withMetadata: true,
          },
        ],
      }),
    });

    const data = await res.json();

    if (data.error) {
      console.error(`Alchemy error (${chain.label}):`, data.error);
      // Error -32600 dengan pesan "X_MAINNET is not enabled for this app" artinya
      // network ini perlu di-toggle ON dulu di Alchemy Dashboard → App → Networks.
      const isNetworkDisabled = data.error.code === -32600 && /not enabled/i.test(data.error.message || '');
      return {
        transfers: [],
        error: isNetworkDisabled
          ? `${chain.label} belum di-enable di Alchemy Dashboard utk app ini.`
          : `${chain.label}: ${data.error.message || 'unknown error'}`,
      };
    }
    if (!data.result || !data.result.transfers) {
      return { transfers: [], error: null };
    }

    return {
      transfers: data.result.transfers.map((tx: any) => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        rawValue: parseFloat(tx.value || 0),
        chain: chain.label,
        priceId: chain.priceId,
        timestamp: tx.metadata?.blockTimestamp || new Date().toISOString(),
      })),
      error: null,
    };
  } catch (error) {
    console.error(`Error fetching ${chain.label} whales:`, error);
    return { transfers: [], error: `${chain.label}: ${String(error)}` };
  }
}

export async function GET() {
  if (!ALCHEMY_API_KEY) {
    return Response.json({
      transactions: DEMO_WHALES,
      isDemo: true,
      message: 'ALCHEMY_API_KEY belum di-set. Tambahin di .env.local (dev) atau Vercel → Project Settings → Environment Variables (production), redeploy, baru live.',
      chains: CHAIN_LABELS,
    });
  }

  try {
    const [prices, chainResults] = await Promise.all([
      getNativePrices(),
      Promise.all(Object.keys(CHAINS).map((key) => fetchChainWhales(key))),
    ]);

    const allTransfers = chainResults.flatMap((r) => r.transfers);
    const chainErrors = chainResults.map((r) => r.error).filter(Boolean) as string[];

    // Filter berdasarkan nilai USD (bukan raw unit) supaya adil lintas chain
    const whales = allTransfers
      .filter((tx) => {
        const price = prices[tx.priceId as 'ethereum' | 'matic-network'];
        return tx.rawValue * price >= WHALE_USD_THRESHOLD;
      })
      .map((tx) => {
        const price = prices[tx.priceId as 'ethereum' | 'matic-network'];
        return {
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: tx.rawValue.toFixed(4),
          usdValue: Math.round(tx.rawValue * price),
          chain: tx.chain,
          timestamp: tx.timestamp,
        };
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 15);

    if (whales.length === 0) {
      const errorNote = chainErrors.length > 0 ? ` Issue per chain: ${chainErrors.join(' | ')}` : '';
      return Response.json({
        transactions: DEMO_WHALES,
        isDemo: true,
        message: `Nggak ada native transfer >= $${WHALE_USD_THRESHOLD.toLocaleString()} dalam ~${BLOCK_LOOKBACK.toLocaleString()} block terakhir.${errorNote} Showing demo data.`,
        chains: CHAIN_LABELS,
      });
    }

    return Response.json({
      transactions: whales,
      isDemo: false,
      count: whales.length,
      chains: CHAIN_LABELS,
      // Tetep kasih tau kalau ada chain yang errornya dilewatin (misal Polygon
      // belum di-enable) walau chain lain (misal Ethereum) sukses & ada whale-nya.
      partialChainErrors: chainErrors.length > 0 ? chainErrors : undefined,
    });
  } catch (error) {
    console.error('Whale tracker error:', error);
    return Response.json({
      transactions: DEMO_WHALES,
      isDemo: true,
      error: String(error),
      message: 'Using demo data - API error',
      chains: CHAIN_LABELS,
    });
  }
}
