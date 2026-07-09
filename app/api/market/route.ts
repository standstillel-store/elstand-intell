// Endpoint: /api/market
// Fetch harga + 24h change dari CoinGecko, gratis, no auth

export async function GET() {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=18&page=1&price_change_percentage=24h',
      { next: { revalidate: 60 } } // cache 1 menit
    );

    const coins = await res.json();

    const simplified = coins.map((c: any) => ({
      symbol: c.symbol.toUpperCase(),
      name: c.name,
      price: c.current_price,
      change24h: c.price_change_percentage_24h || 0,
      marketCap: c.market_cap,
    }));

    return Response.json({ coins: simplified });
  } catch (error) {
    return Response.json({ error: 'Failed to fetch market data' }, { status: 500 });
  }
}
