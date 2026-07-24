"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Monitor, LogOut, LogOutIcon, Loader2, Smartphone } from "lucide-react";
import { SettingsCard, SettingsRow } from "../SettingsCard";
import { parseDeviceLabel } from "@/lib/device";
import { timeAgo } from "@/lib/format";

interface DeviceRow {
  id: string;
  device_label: string;
  first_seen_at: string;
  last_seen_at: string;
}

interface ActivityRow {
  id: string;
  event_type: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const EVENT_LABEL: Record<string, string> = {
  login: "Login",
  logout: "Logout",
  logout_all: "Logout dari semua device",
  wallet_connected: "Wallet terhubung",
  wallet_disconnected: "Wallet diputus",
  energy_spent: "AI Energy terpakai",
  energy_reset: "AI Energy reset",
  settings_changed: "Pengaturan diubah",
  account_delete_requested: "Permintaan hapus akun",
};

export function SecuritySection() {
  const router = useRouter();
  const [device, setDevice] = useState<string | null>(null);
  const [devices, setDevices] = useState<DeviceRow[] | null>(null);
  const [activity, setActivity] = useState<ActivityRow[] | null>(null);
  const [loggingOut, setLoggingOut] = useState<"local" | "global" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDevice(parseDeviceLabel(navigator.userAgent));
    fetch("/api/account/devices")
      .then((r) => (r.ok ? r.json() : { devices: [] }))
      .then((res) => setDevices(res.devices ?? []))
      .catch(() => setDevices([]));
    fetch("/api/account/activity")
      .then((r) => (r.ok ? r.json() : { activity: [] }))
      .then((res) => setActivity(res.activity ?? []))
      .catch(() => setActivity([]));
  }, []);

  async function handleLogout(scope: "local" | "global") {
    setLoggingOut(scope);
    setError(null);
    try {
      const { createSupabaseBrowserClient } = await import("@/lib/auth/client");
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut({ scope });
      router.push("/login");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auth belum dikonfigurasi.");
    } finally {
      setLoggingOut(null);
    }
  }

  return (
    <SettingsCard id="security" icon={ShieldCheck} title="Security" description="Sesi aktif, riwayat device, dan kontrol logout.">
      <SettingsRow label="Session" hint="Perangkat yang sedang membuka dashboard ini sekarang. Session otomatis diperpanjang (auto-refresh) selama kamu aktif — lihat AI Energy & Wallet di atas untuk apa yang tersimpan per akun.">
        <span className="flex items-center gap-1.5 rounded-md border border-up/30 bg-up/10 px-2.5 py-1 text-xs text-up">
          <Monitor size={12} /> Aktif
        </span>
      </SettingsRow>

      <SettingsRow label="Perangkat ini" hint="Terdeteksi dari browser saat ini.">
        <span className="mono-num text-xs text-ink-muted">{device ?? "…"}</span>
      </SettingsRow>

      {devices && devices.length > 0 && (
        <div className="space-y-1.5 border-t border-line pt-3.5">
          <p className="text-[11px] uppercase tracking-wide text-ink-faint">Riwayat login device</p>
          {devices.map((d) => (
            <div key={d.id} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-ink-muted">
                <Smartphone size={12} className="text-ink-faint" />
                {d.device_label}
              </span>
              <span className="mono-num text-ink-faint">terakhir {timeAgo(d.last_seen_at)}</span>
            </div>
          ))}
        </div>
      )}

      {activity && activity.length > 0 && (
        <div className="space-y-1.5 border-t border-line pt-3.5">
          <p className="text-[11px] uppercase tracking-wide text-ink-faint">Activity Log</p>
          <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
            {activity.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-xs">
                <span className="text-ink-muted">{EVENT_LABEL[a.event_type] ?? a.event_type}</span>
                <span className="mono-num text-ink-faint">{timeAgo(a.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <SettingsRow label="Logout" hint="Mengakhiri sesi login di perangkat ini saja.">
        <button
          onClick={() => handleLogout("local")}
          disabled={loggingOut !== null}
          className="flex items-center gap-1.5 rounded-md border border-line px-3.5 py-2 text-xs font-medium text-ink-muted hover:border-down/40 hover:text-down disabled:opacity-50"
        >
          {loggingOut === "local" ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />}
          {loggingOut === "local" ? "Memproses…" : "Logout"}
        </button>
      </SettingsRow>

      <SettingsRow label="Logout All Devices" hint="Mengakhiri seluruh sesi login (semua device) via Supabase Auth.">
        <button
          onClick={() => handleLogout("global")}
          disabled={loggingOut !== null}
          className="flex items-center gap-1.5 rounded-md border border-down/40 px-3.5 py-2 text-xs font-medium text-down hover:bg-down/10 disabled:opacity-50"
        >
          {loggingOut === "global" ? <Loader2 size={13} className="animate-spin" /> : <LogOutIcon size={13} />}
          {loggingOut === "global" ? "Memproses…" : "Logout All Devices"}
        </button>
      </SettingsRow>
      {error && <p className="text-[11px] text-ink-faint">{error}</p>}
    </SettingsCard>
  );
}
