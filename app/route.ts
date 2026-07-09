const ETHERSCAN_KEY = process.env.ETHERSCAN_API_KEY || 'DTB6ET3WBU3BCU3EESRHV2TG3WXQW76SCY';

export async function GET() {
  try {
    // Fetch internal transactions (ETH transfers)
    const url = `https://api.etherscan.io/api?module=account&action=txlistinternal&startblock=0&endblock=99999999&sort=desc&page=1&offset=100&apikey=${ETHERSCAN_KEY}`;
    
    const res = await fetch(url, { next: { revalidate: 300 } }); // cache 5 menit
    const data = await res.json();

    if (data.status !== '1' || !Array.isArray(data.result)) {
      return Response.json({ transactions: [] });
    }

    // Filter whale transactions (> 50 ETH)
    const whales = data.result
      .filter((tx: any) => {
        const valueInEth = parseInt(tx.value) / 1e18;
        return valueInEth >= 50;
      })
      .slice(0, 15)
      .map((tx: any) => {
        const valueInEth = parseInt(tx.value) / 1e18;
        return {
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: valueInEth.toFixed(2),
          timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
        };
      });

    return Response.json({ transactions: whales });
  } catch (error) {
    console.error('Whale API error:', error);
    return Response.json({ transactions: [], error: String(error) });
  }
}
