// Endpoint: /api/economic-calendar
// Fetch economic events dari Financial Modeling Prep API

export async function GET() {
  try {
    const apiKey = process.env.NEWS_API_KEY;
    
    if (!apiKey) {
      return Response.json({ error: 'API key not configured' }, { status: 500 });
    }

    const res = await fetch(
      `https://financialmodelingprep.com/stable/economic-calendar?apikey=${apiKey}`,
      { next: { revalidate: 3600 } } // cache 1 jam
    );

    const data = await res.json();

    // Filter hanya ekonomi event penting (CPI, FOMC, Jobs, dll)
    const importantEvents = (data || [])
      .filter((event: any) => {
        const eventName = event.event?.toLowerCase() || '';
        return (
          eventName.includes('cpi') ||
          eventName.includes('fomc') ||
          eventName.includes('jobless') ||
          eventName.includes('jobs') ||
          eventName.includes('pce') ||
          eventName.includes('gdp') ||
          eventName.includes('unemployment')
        );
      })
      .slice(0, 10)
      .map((event: any) => ({
        event: event.event,
        date: event.date,
        impact: event.impact || 'Medium',
        forecast: event.forecast,
        previous: event.previous,
        actual: event.actual,
      }));

    return Response.json({ events: importantEvents });
  } catch (error) {
    return Response.json({ error: 'Failed to fetch economic calendar' }, { status: 500 });
  }
}
