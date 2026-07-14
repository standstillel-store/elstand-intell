import { AppShell } from "@/components/AppShell";
import { SettingsView } from "@/components/settings/SettingsView";
import { getWallet, getDefaultWallet } from "@/lib/elvoid/paperTrader";

export const metadata = {
  title: "Settings | ELSTAND INTELLIGENCE",
};

export default async function SettingsPage() {
  const wallet = (await getWallet()) ?? getDefaultWallet();
  return (
    <AppShell title="Settings" subtitle="Pengaturan Paper Trader dan status integrasi data.">
      <SettingsView initialWallet={wallet} />
    </AppShell>
  );
}
