// News API - fetch dari Newsdata.io
// Free tier: 50 requests/day
// Cache: 24 jam (hemat quota)

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Demo: hardcode untuk sekarang (jika API key tidak setup)
    // Nanti tinggal uncomment kalo sudah setup NEWSDATA_API_KEY
    
    const demoNews = [
      {
        title: 'Bitcoin Hits New ATH, Eyes $100K',
        source: 'CoinTelegraph',
        url: 'https://cointelegraph.com',
        image: 'https://via.placeholder.com/200x100?text=Bitcoin',
        publishedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 jam lalu
        description: 'Bitcoin continues bullish momentum as institutional interest grows',
      },
      {
        title: 'Ethereum Merge Impact Positive for Environment',
        source: 'The Block',
        url: 'https://theblock.co',
        image: 'https://via.placeholder.com/200x100?text=Ethereum',
        publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 jam lalu
        description: 'Latest report shows significant reduction in energy consumption',
      },
      {
        title: 'Solana Network Sees Increased Activity',
        source: 'Decrypt',
        url: 'https://decrypt.co',
        image: 'https://via.placeholder.com/200x100?text=Solana',
        publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 jam lalu
        description: 'SOL token surges on network upgrade announcement',
      },
      {
        title: 'SEC Approves More Spot Crypto ETFs',
        source: 'CoinDesk',
        url: 'https://coindesk.com',
        image: 'https://via.placeholder.com/200x100?text=SEC',
        publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 jam lalu
        description: 'Regulatory breakthrough attracts mainstream investors',
      },
      {
        title: 'Web3 Gaming Boom: New Games Launch Weekly',
        source: 'NFT Now',
        url: 'https://nftnow.com',
        image: 'https://via.placeholder.com/200x100?text=Gaming',
        publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 jam lalu
        description: 'Play-to-earn platforms attract millions of new players',
      },
    ];

    // Uncomment untuk live API (setelah setup NEWSDATA_API_KEY):
    /*
    const API_KEY = process.env.NEWSDATA_API_KEY;
    if (!API_KEY) {
      return Response.json({ news: demoNews });
    }

    const res = await fetch(
      `https://newsdata.io/api/1/news?q=crypto%20bitcoin%20ethereum&lang=en&apikey=${API_KEY}`,
      { next: { revalidate: 86400 } } // cache 24 jam
    );

    const data = await res.json();
    const news = (data.results || []).slice(0, 10).map((item: any) => ({
      title: item.title,
      source: item.source_id,
      url: item.link,
      image: item.image_url || 'https://via.placeholder.com/200x100',
      publishedAt: item.pubDate,
      description: item.description,
    }));

    return Response.json({ news });
    */

    return Response.json({ news: demoNews });
  } catch (error) {
    return Response.json({ news: [], error: String(error) });
  }
}
