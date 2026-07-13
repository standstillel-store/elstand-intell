import { AppShell } from "@/components/AppShell";
import { Disclaimer } from "@/components/Disclaimer";
import { PerformanceView } from "@/components/ai-performance/PerformanceView";
import { getPerformanceReport } from "@/lib/elvoid/performance";

export const metadata = {
  title: "AI Performance | Nocturn",
};

export default async function AiPerformancePage() {
  const report = await getPerformanceReport();
  return (
    <AppShell title="AI Performance" subtitle="ElVoid AI mengevaluasi seluruh histori paper trade untuk menemukan pola yang benar-benar bekerja.">
      <Disclaimer>
        Angka di halaman ini adalah <strong className="font-medium">probability</strong> historis dari paper trading — bukan
        jaminan performa ke depan. Semakin banyak trade tercatat, semakin representatif datanya.
      </Disclaimer>
      <PerformanceView report={report} />
    </AppShell>
  );
}
