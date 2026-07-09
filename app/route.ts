// Alchemy API - Multi-chain whale tracker
// Support: ETH, Polygon, Arbitrum, Optimism, Base
// Free tier: unlimited requests

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || 'bY2Zb9a1o8UQQpb2pY2qF';

// Alchemy endpoints untuk berbagai chain
const CHAINS = {
  eth: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  polygon: `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  arbitrum: `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  optimism: `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  base: `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
};

// Demo whales jika API error
const DEMO_WHALES = [
  {
    hash: '0xabc123def456789abc123def456789abc123def',
    from: '0x1234567890123456789012345678901234567890',
    to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    value: '125.50',
    chain: 'Ethereum',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    hash: '0xdef789abc123456def789abc123456def789abc1',
    from: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    to: '0x1111111111111111111111111111111111111111',
    value: '87.25',
    chain: 'Polygon',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    hash: '0x456789def123abc456789def123abc456789def1',
    from: '0x2222222222222222222222222222222222222222',
    to: '0x3333333333333333333333333333333333333333',
    value: '156.00',
    chain: 'Arbitrum',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    hash: '0x789abc456def123789abc456def123789abc456d',
    from: '0x4444444444444444444444444444444444444444',
    to: '0x5555555555555555555555555555555555555555',
    value: '42.75',
    chain: 'Optimism',
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },
  {
    hash: '0xabcdef789abc456abcdef789abc456abcdef789a',
    from: '0x6666666666666666666666666666666666666666',
    to: '0x7777777777777777777777777777777777777777',
    value: '210.00',
    chain: 'Base',
    timestamp: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
  },
];

// Fetch whale transfers dari Alchemy dengan AssetTransfers API
async function fetchChainWhales(chainName: string, endpoint: string) {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'alchemy_getAssetTransfers',
        params: [
          {
            category: ['external', 'internal', 'erc20'],
            maxCount: '0x64',
            excludeZeroValue: true,
            order: 'desc',
          },
        ],
      }),
    });

    const data = await res.json();

    if (!data.result || !data.result.transfers) {
      return [];
    }

    // Filter large transfers (whale activity)
    const whales = data.result.transfers
      .filter((tx: any) => {
        const value = parseFloat(tx.value || 0);
        return value >= 10; // Adjust threshold based on chain
      })
      .slice(0, 3) // Top 3 per chain
      .map((tx: any) => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: (tx.value || 0).toFixed(2),
        chain: chainName,
        timestamp: new Date().toISOString(),
      }));

    return whales;
  } catch (error) {
    console.error(`Error fetching ${chainName} whales:`, error);
    return [];
  }
}

export async function GET() {
  try {
    // Fetch dari semua chains parallel
    const [ethWhales, polygonWhales, arbitrumWhales, optimismWhales, baseWhales] = await Promise.all([
      fetchChainWhales('Ethereum', CHAINS.eth),
      fetchChainWhales('Polygon', CHAINS.polygon),
      fetchChainWhales('Arbitrum', CHAINS.arbitrum),
      fetchChainWhales('Optimism', CHAINS.optimism),
      fetchChainWhales('Base', CHAINS.base),
    ]);

    const allWhales = [ethWhales, polygonWhales, arbitrumWhales, optimismWhales, baseWhales]
      .flat()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 15);

    // Jika tidak ada data real, return demo
    if (allWhales.length === 0) {
      return Response.json({
        transactions: DEMO_WHALES,
        isDemo: true,
        message: 'No whale activity. Showing demo data.',
        chains: ['Ethereum', 'Polygon', 'Arbitrum', 'Optimism', 'Base'],
      });
    }

    return Response.json({
      transactions: allWhales,
      isDemo: false,
      count: allWhales.length,
      chains: ['Ethereum', 'Polygon', 'Arbitrum', 'Optimism', 'Base'],
    });
  } catch (error) {
    console.error('Whale tracker error:', error);
    return Response.json({
      transactions: DEMO_WHALES,
      isDemo: true,
      error: String(error),
      message: 'Using demo data - API error',
      chains: ['Ethereum', 'Polygon', 'Arbitrum', 'Optimism', 'Base'],
    });
  }
}
