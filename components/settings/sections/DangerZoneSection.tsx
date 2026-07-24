"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2, Loader2, UserX } from "lucide-react";
import { SettingsCard, SettingsRow } from "../SettingsCard";

export function DangerZoneSection({
  onReset,
  resetting,
  confirmReset,
}: {
  onReset: () => void;
  resetting: boolean;
  confirmReset: boolean;
}) {
  const router = useRouter();
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleClearCache() {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    setClearing(true);
    try {
      if (typeof caches !== "undefined") {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } finally {
      window.location.reload();
    }
  }

  async function handleDeleteAccount() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" }).then((r) => r.json());
      if (res.error) {
        setDeleteError(res.error);
        setDeleting(false);
        return;
      }
      // Account (and its session) is gone server-side — clear the local
      // session cookie too, same as the Security section's own sign-out,
      // then land back on the marketing page (not /login: there's no
      // account left to log back into).
      // Account is already gone server-side at this point — this is local
      // cookie cleanup only, so it's wrapped separately and never reported
      // as a deletion failure even if it errors.
      try {
        const { createSupabaseBrowserClient } = await import("@/lib/auth/client");
        await createSupabaseBrowserClient().auth.signOut({ scope: "local" });
      } catch {
        // Nothing to sign out of, or auth wasn't configured — fine either way.
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Gagal menghapus akun.");
      setDeleting(false);
    }
  }

  return (
    <SettingsCard id="danger-zone" icon={AlertTriangle} title="Danger Zone" tone="down" description="Tindakan ini tidak bisa dibatalkan.">
      <SettingsRow label="Reset Paper Trading" hint="Menghapus seluruh sinyal, journal, dan statistik, lalu mengembalikan wallet ke $10,000.">
        <button
          onClick={onReset}
          disabled={resetting}
          className={`flex items-center gap-1.5 rounded-md border px-3.5 py-2 text-xs font-medium disabled:opacity-50 ${
            confirmReset ? "border-down bg-down/15 text-down" : "border-line text-ink-muted hover:border-down/40 hover:text-down"
          }`}
        >
          {resetting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
          {resetting ? "Mereset…" : confirmReset ? "Klik lagi untuk konfirmasi" : "Reset Paper Trading"}
        </button>
      </SettingsRow>

      <SettingsRow label="Clear Cache" hint="Menghapus cache browser lokal untuk dashboard ini lalu memuat ulang halaman.">
        <button
          onClick={handleClearCache}
          disabled={clearing}
          className={`flex items-center gap-1.5 rounded-md border px-3.5 py-2 text-xs font-medium disabled:opacity-50 ${
            confirmClear ? "border-down bg-down/15 text-down" : "border-line text-ink-muted hover:border-down/40 hover:text-down"
          }`}
        >
          {clearing ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
          {clearing ? "Membersihkan…" : confirmClear ? "Klik lagi untuk konfirmasi" : "Clear Cache"}
        </button>
      </SettingsRow>

      <SettingsRow
        label="Delete Account"
        hint="Menghapus akun Google login ini secara permanen — profil, wallet terhubung, AI Energy, dan riwayat aktivitas. Tidak menghapus data Paper Trading (dibagi semua pengguna, lihat catatan di README)."
      >
        <button
          onClick={handleDeleteAccount}
          disabled={deleting}
          className={`flex items-center gap-1.5 rounded-md border px-3.5 py-2 text-xs font-medium disabled:opacity-50 ${
            confirmDelete ? "border-down bg-down/15 text-down" : "border-line text-ink-muted hover:border-down/40 hover:text-down"
          }`}
        >
          {deleting ? <Loader2 size={13} className="animate-spin" /> : <UserX size={13} />}
          {deleting ? "Menghapus…" : confirmDelete ? "Klik lagi untuk konfirmasi" : "Delete Account"}
        </button>
      </SettingsRow>
      {deleteError && <p className="text-[11px] text-down">{deleteError}</p>}
    </SettingsCard>
  );
}
