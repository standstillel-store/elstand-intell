// Endpoint: /api/fear-greed
// Fetch dari alternative.me, gratis, no auth

export async function GET() {
  try {
    const res = await fetch('https://api.alternative.me/fng/?limit=1', {
      next: { revalidate: 3600 }, // cache 1 jam biar hemat
    });

    const data = await res.json();
    const fgData = data.data[0];

    return Response.json({
      value: parseInt(fgData.value),
      label: fgData.value_classification,
      timestamp: fgData.timestamp,
    });
  } catch (error) {
    return Response.json({ error: 'Failed to fetch Fear & Greed data' }, { status: 500 });
  }
}
