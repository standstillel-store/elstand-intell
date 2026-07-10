export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=15&page=1&price_change_percentage=24h',
      { next: { revalidate: 60 } }
    );
    const coins = await res.json();

    return Response.json({
      coins: coins.map((c: any) => ({
        symbol: c.symbol.toUpperCase(),
        price: c.current_price,
        change24h: c.price_change_percentage_24h || 0,
      })),
    });
  } catch {
    return Response.json({ error: 'Failed' }, { status: 500 });
  }
}
