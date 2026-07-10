// Economic Calendar - Financial Modeling Prep (FMP)
// Docs: https://financialmodelingprep.com/stable/economic-calendar
// Free tier: 250 requests/day -> di-cache 5 menit biar hemat kuota

const FMP_API_KEY = process.env.FMP_API_KEY;

// Cuma tampilin negara-negara besar biar nggak kebanjiran data minor.
// Tambah/kurangi kode negara di sini kalau mau ubah cakupannya.
const RELEVANT_COUNTRIES = ['US', 'EU', 'GB', 'JP', 'CN', 'DE'];

// Cuma tampilin impact Medium/High biar nggak noise. Set ke [] kalau mau semua level.
const RELEVANT_IMPACT = ['Medium', 'High'];

const COUNTRY_LABELS: Record<string, string> = {
  US: '🇺🇸 USA',
  EU: '🇪🇺 EUR',
  GB: '🇬🇧 UK',
  JP: '🇯🇵 Japan',
  CN: '🇨🇳 China',
  DE: '🇩🇪 Germany',
  FR: '🇫🇷 France',
  CA: '🇨🇦 Canada',
  AU: '🇦🇺 Australia',
  CH: '🇨🇭 Switzerland',
};

type CalendarEvent = {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM UTC
  country: string;
  event: string;
  impact: string;
  forecast: string;
  previous: string;
  actual: string;
};

const DEMO_EVENTS: CalendarEvent[] = [
  { date: '2026-07-11', time: '12:30 UTC', country: '🇺🇸 USA', event: 'CPI YoY (Jun)', impact: 'High', forecast: '2.9%', previous: '3.0%', actual: '—' },
  { date: '2026-07-15', time: '20:00 UTC', country: '🇺🇸 USA', event: 'Initial Jobless Claims', impact: 'Medium', forecast: '235K', previous: '238K', actual: '—' },
  { date: '2026-07-17', time: '18:00 UTC', country: '🇺🇸 USA', event: 'FOMC Meeting Minutes', impact: 'High', forecast: '—', previous: '—', actual: '—' },
];

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

// PENTING: paksa route ini jalan per-request (bukan di-freeze jadi 1 hasil statis
// pas build). Tanpa ini, Next.js coba nge-generate response-nya SEKALI aja
// waktu "next build" (makanya kelihatan di build log), lalu hasil itu (termasuk
// kalau errornya jatuh ke demo data) ke-cache selamanya sampai deploy berikutnya.
// fetch() di bawah tetap pakai revalidate 300s, jadi kita tetap hemat kuota FMP,
// tapi route-nya sendiri sekarang selalu dieksekusi live.
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!FMP_API_KEY) {
    return Response.json({
      events: DEMO_EVENTS,
      isDemo: true,
      message: 'FMP_API_KEY belum di-set. Tambahin di .env.local (dev) atau Vercel → Project Settings → Environment Variables, redeploy, baru live.',
    });
  }

  try {
    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - 3); // 3 hari ke belakang, biar event yang baru rilis kelihatan Actual-nya
    const to = new Date(today);
    to.setDate(to.getDate() + 14); // 14 hari ke depan

    const url = `https://financialmodelingprep.com/stable/economic-calendar?from=${fmtDate(from)}&to=${fmtDate(to)}&apikey=${FMP_API_KEY}`;

    const res = await fetch(url, { next: { revalidate: 300 } }); // cache 5 menit

    // Baca sebagai text dulu, JANGAN langsung res.json() — kalau FMP balikin
    // response non-JSON (misal halaman "Restricted"/HTML block dari plan/IP
    // restriction), res.json() bakal throw SyntaxError yang susah didiagnosis.
    // Dengan cara ini, isi aslinya kelihatan di "message" pada dashboard.
    const rawText = await res.text();
    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch {
      console.error('FMP calendar non-JSON response:', res.status, rawText.slice(0, 300));
      return Response.json({
        events: DEMO_EVENTS,
        isDemo: true,
        message: `FMP API balikin response non-JSON (HTTP ${res.status}). Kemungkinan endpoint Economic Calendar dibatasi utk plan Basic/Free, atau request dari server Vercel diblokir FMP. Raw response: "${rawText.slice(0, 200)}"`,
      });
    }

    if (!Array.isArray(data)) {
      console.error('FMP calendar error:', data);
      return Response.json({
        events: DEMO_EVENTS,
        isDemo: true,
        message: `FMP API error: ${data?.['Error Message'] || JSON.stringify(data).slice(0, 200)}`,
      });
    }

    const events: CalendarEvent[] = data
      .filter((e: any) => RELEVANT_COUNTRIES.includes(e.country))
      .filter((e: any) => RELEVANT_IMPACT.length === 0 || RELEVANT_IMPACT.includes(e.impact))
      .map((e: any) => {
        const dt = new Date(e.date); // FMP returns UTC datetime string
        return {
          date: e.date?.slice(0, 10) || '',
          time: isNaN(dt.getTime())
            ? '—'
            : `${dt.getUTCHours().toString().padStart(2, '0')}:${dt.getUTCMinutes().toString().padStart(2, '0')} UTC`,
          country: COUNTRY_LABELS[e.country] || e.country || '—',
          event: e.event || '—',
          impact: e.impact || 'Low',
          forecast: e.estimate !== null && e.estimate !== undefined ? String(e.estimate) : '—',
          previous: e.previous !== null && e.previous !== undefined ? String(e.previous) : '—',
          actual: e.actual !== null && e.actual !== undefined ? String(e.actual) : '—', // "—" = belum rilis
        };
      })
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

    if (events.length === 0) {
      return Response.json({
        events: DEMO_EVENTS,
        isDemo: true,
        message: 'Nggak ada event yang cocok filter negara/impact dalam rentang tanggal ini. Showing demo data.',
      });
    }

    return Response.json({ events, isDemo: false, count: events.length });
  } catch (error) {
    console.error('Calendar error:', error);
    return Response.json({
      events: DEMO_EVENTS,
      isDemo: true,
      error: String(error),
      message: 'Using demo data - API error',
    });
  }
}
