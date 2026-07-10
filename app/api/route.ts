export async function GET() {
  try {
    const res = await fetch('https://api.alternative.me/fng/?limit=1', {
      next: { revalidate: 3600 },
    });
    const data = await res.json();
    const fgData = data.data[0];

    return Response.json({
      value: parseInt(fgData.value),
      label: fgData.value_classification,
    });
  } catch {
    return Response.json({ error: 'Failed' }, { status: 500 });
  }
}
