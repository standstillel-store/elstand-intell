import { SettingsView } from "@/components/settings/SettingsView";
import { getWallet, getDefaultWallet } from "@/lib/elvoid/paperTrader";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { getAppUser, getAppProfile } from "@/lib/auth/profile";

export const metadata = {
  title: "Settings | ELSTAND INTELLIGENCE",
};

export default async function SettingsPage() {
  const wallet = (await getWallet()) ?? getDefaultWallet();

  // Account data (Phase 3) — fetched server-side so Account/Security render
  // with real data on first paint instead of a loading flicker. null when
  // Supabase Auth isn't configured or nobody's signed in (shouldn't happen
  // here since /settings is behind middleware's route guard, but this page
  // shouldn't hard-fail either way).
  let account: Awaited<ReturnType<typeof getAppUser>> = null;
  let profile: Awaited<ReturnType<typeof getAppProfile>> = null;
  const supabase = createSupabaseServerClient();
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      [account, profile] = await Promise.all([getAppUser(supabase, user.id), getAppProfile(supabase, user.id)]);
    }
  }

  return <SettingsView initialWallet={wallet} account={account} profile={profile} />;
}
