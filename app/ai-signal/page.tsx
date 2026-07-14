import { AppShell } from "@/components/AppShell";
import { AiSignalView } from "@/components/ai-signal/AiSignalView";

export const metadata = {
  title: "AI Signal | ELSTAND INTELLIGENCE",
};

export default function AiSignalPage() {
  return (
    <AppShell
      title="ElVoid AI Signal"
      subtitle="Scan S/R, price action, liquidity, trend, volume, whale, news, struktur pasar, dan risiko — sekaligus."
    >
      <AiSignalView />
    </AppShell>
  );
}
