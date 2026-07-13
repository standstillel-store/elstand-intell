import { AppShell } from "@/components/AppShell";
import { JournalView } from "@/components/ai-journal/JournalView";
import { Disclaimer } from "@/components/Disclaimer";
import { getJournalEntries } from "@/lib/elvoid/performance";

export const metadata = {
  title: "AI Journal | Nocturn",
};

export default async function AiJournalPage() {
  const entries = await getJournalEntries(200);
  return (
    <AppShell title="AI Journal" subtitle="Riwayat setiap paper trade yang sudah ditutup, lengkap dengan alasan sinyal aslinya.">
      <Disclaimer />
      <JournalView entries={entries} />
    </AppShell>
  );
}
