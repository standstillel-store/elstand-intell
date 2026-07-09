// Endpoint: /api/news
// Fetch crypto news dari CryptoCompare (gratis) atau hardcode

export async function GET() {
  try {
    // CryptoCompare free news API
    const res = await fetch(
      'https://min-api.cryptocompare.com/data/v1/news/?lang=EN',
      { next: { revalidate: 1800 } } // cache 30 menit
    );

    const data = await res.json();

    if (!data.Data || data.Data.length === 0) {
      // Fallback: hardcode news jika API fail
      return Response.json({ 
        news: getFallbackNews() 
      });
    }

    const news = data.Data.slice(0, 8).map((item: any) => ({
      title: item.title,
      body: item.body?.substring(0, 150) + '...' || 'No description',
      source: item.source,
      url: item.url,
      imageUrl: item.imageurl,
      publishedOn: new Date(item.published_on * 1000).toLocaleString(),
    }));

    return Response.json({ news });
  } catch (error) {
    // Fallback
    return Response.json({ news: getFallbackNews() });
  }
}

function getFallbackNews() {
  return [
    {
      title: 'Bitcoin Reaches New High',
      body: 'BTC surges above previous resistance level...',
      source: 'CoinTelegraph',
      url: '#',
      imageUrl: '',
      publishedOn: new Date().toLocaleString(),
    },
    {
      title: 'Ethereum Network Upgrade Announced',
      body: 'Major network improvements coming next quarter...',
      source: 'The Block',
      url: '#',
      imageUrl: '',
      publishedOn: new Date().toLocaleString(),
    },
    {
      title: 'Crypto Market Sentiment Shifts Bullish',
      body: 'Fear & Greed Index shows significant movement...',
      source: 'CryptoSlate',
      url: '#',
      imageUrl: '',
      publishedOn: new Date().toLocaleString(),
    },
    {
      title: 'Solana Network Stability Improves',
      body: 'Latest updates show reduced downtime incidents...',
      source: 'Decrypt',
      url: '#',
      imageUrl: '',
      publishedOn: new Date().toLocaleString(),
    },
  ];
}
