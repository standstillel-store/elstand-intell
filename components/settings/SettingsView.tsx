"use client";
import { useEffect, useState } from "react";
import { AlertTriangle, Check, X, Save } from "lucide-react";
import type { PaperWallet } from "@/lib/elvoid/types";

interface Status {
  supabase: boolean;
  alchemy: boolean;
  newsapi: boolean;
  fred: boolean;
}

export function SettingsView({ initialWallet }: { initialWallet: PaperWallet }) {
  const [wallet, setWallet] = useState(initialWallet);
  const [riskInput, setRiskInput] = useState(String(initialWallet.risk_per_trade));
  const [autoExecute, setAutoExecute] = useState(initialWallet.auto_execute);
  const [autoExecuteMinGrade, setAutoExecuteMinGrade] = useState<PaperWallet["auto_execute_min_grade"]>(initialWallet.auto_execute_min_grade);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    fetch("/api/settings/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {});
  }, []);

  async function handleSaveRisk() {
    const value = parseFloat(riskInput);
    if (Number.isNaN(value)) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/paper-trader/wallet", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ riskPercent: value, autoExecute, autoExecuteMinGrade }),
      }).then((r) => r.json());
      if (res.wallet) {
        setWallet(res.wallet);
        setSaved(true);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    setResetting(true);
    try {
      await fetch("/api/paper-trader/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startingBalance: 10000 }),
      });
      setWallet({
        balance: 10000,
        equity: 10000,
        total_profit: 0,
        risk_per_trade: wallet.risk_per_trade,
        auto_execute: wallet.auto_execute,
        auto_execute_min_grade: wallet.auto_execute_min_grade,
        updated_at: new Date().toISOString(),
      });
      setConfirmReset(false);
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="glow-card p-4">
        <h2 className="text-sm font-semibold">Paper Wallet</h2>
        <p className="mt-1 text-xs text-ink-muted">Risk per trade menentukan besar posisi setiap sinyal yang dieksekusi.</p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-md border border-line p-3">
            <p className="text-[10px] uppercase text-ink-faint">Balance</p>
            <p className="mono-num text-sm">${wallet.balance.toLocaleString("en-US", { maximumFractionDigits: 2 })}</p>
          </div>
          <div className="rounded-md border border-line p-3">
            <p className="text-[10px] uppercase text-ink-faint">Equity</p>
            <p className="mono-num text-sm">${wallet.equity.toLocaleString("en-US", { maximumFractionDigits: 2 })}</p>
          </div>
          <div className="rounded-md border border-line p-3">
            <p className="text-[10px] uppercase text-ink-faint">Total Profit</p>
            <p className={`mono-num text-sm ${wallet.total_profit >= 0 ? "text-up" : "text-down"}`}>
              {wallet.total_profit >= 0 ? "+" : ""}
              {wallet.total_profit.toFixed(2)}%
            </p>
          </div>
          <div className="rounded-md border border-line p-3">
            <p className="text-[10px] uppercase text-ink-faint">Risk / Trade</p>
            <p className="mono-num text-sm">{wallet.risk_per_trade}%</p>
          </div>
        </div>

        <div className="mt-4 flex items-end gap-2">
          <label className="flex-1">
            <span className="text-xs text-ink-muted">Risk per Trade (%)</span>
            <input
              type="number"
              min={0.1}
              max={10}
              step={0.1}
              value={riskInput}
              onChange={(e) => {
                setRiskInput(e.target.value);
                setSaved(false);
              }}
              className="mt-1 w-full rounded-md border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-signal/50"
            />
          </label>
          <button
            onClick={handleSaveRisk}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-md bg-signal px-3.5 py-2 text-xs font-medium text-white hover:bg-signal-glow disabled:opacity-50"
          >
            <Save size={13} />
            {saving ? "Menyimpan…" : saved ? "Tersimpan" : "Simpan"}
          </button>
        </div>

        <div className="mt-4 rounded-md border border-line p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">AI Auto-Execute</p>
              <p className="mt-0.5 text-[11px] text-ink-muted">
                ElVoid AI otomatis membuka Market Order untuk sinyal baru dari <strong className="text-ink">Scan Market</strong> yang
                memenuhi Trade Grade minimum di bawah ini.
              </p>
            </div>
            <button
              onClick={() => {
                setAutoExecute((v) => !v);
                setSaved(false);
              }}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${autoExecute ? "bg-signal" : "bg-bg-raised"}`}
              aria-pressed={autoExecute}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  autoExecute ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
          {autoExecute && (
            <div className="mt-3 flex overflow-hidden rounded-md border border-line text-xs">
              {(["A+", "A", "B", "C"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => {
                    setAutoExecuteMinGrade(g);
                    setSaved(false);
                  }}
                  className={`flex-1 py-1.5 transition-colors ${
                    autoExecuteMinGrade === g ? "bg-signal/20 text-signal-glow" : "text-ink-faint hover:text-ink"
                  }`}
                >
                  Grade {g}+
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="glow-card p-4">
        <h2 className="text-sm font-semibold">Status Integrasi</h2>
        <p className="mt-1 text-xs text-ink-muted">Status koneksi sumber data — tidak menampilkan key apapun.</p>
        <div className="mt-3 space-y-2">
          {(
            [
              { key: "supabase", label: "Supabase (persistensi Paper Trader & AI Journal)" },
              { key: "alchemy", label: "Alchemy (whale feed)" },
              { key: "newsapi", label: "NewsAPI (news feed)" },
              { key: "fred", label: "FRED (DXY proxy & M2 money supply)" },
            ] as const
          ).map((item) => {
            const ok = status ? status[item.key] : undefined;
            return (
              <div key={item.key} className="flex items-center justify-between rounded-md border border-line px-3 py-2 text-sm">
                <span>{item.label}</span>
                {ok === undefined ? (
                  <span className="text-xs text-ink-faint">Memeriksa…</span>
                ) : ok ? (
                  <span className="flex items-center gap-1 text-xs text-up">
                    <Check size={13} /> Terhubung
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-ink-faint">
                    <X size={13} /> Belum diset
                  </span>
                )}
              </div>
            );
          })}
          <div className="flex items-center justify-between rounded-md border border-line px-3 py-2 text-sm">
            <span>DefiLlama (stablecoin supply)</span>
            <span className="flex items-center gap-1 text-xs text-up">
              <Check size={13} /> Tidak perlu API key
            </span>
          </div>
        </div>
        {status && !status.supabase && (
          <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
            Tambahkan <code className="rounded bg-bg-raised px-1 py-0.5">NEXT_PUBLIC_SUPABASE_URL</code> dan{" "}
            <code className="rounded bg-bg-raised px-1 py-0.5">SUPABASE_SERVICE_ROLE_KEY</code> di .env.local, lalu jalankan{" "}
            <code className="rounded bg-bg-raised px-1 py-0.5">supabase/schema.sql</code> di Supabase SQL editor. Buat juga
            Storage bucket <code className="rounded bg-bg-raised px-1 py-0.5">trade-screenshots</code> (public) untuk fitur
            screenshot di AI Journal.
          </p>
        )}
        {status && !status.fred && (
          <p className="mt-2 text-[11px] leading-relaxed text-ink-faint">
            Kartu DXY dan M2 di dashboard butuh <code className="rounded bg-bg-raised px-1 py-0.5">FRED_API_KEY</code> gratis
            dari fred.stlouisfed.org. DXY di sini adalah proxy Broad USD Index (FRED: DTWEXBGS), bukan ticker ICE DXY asli.
          </p>
        )}
      </div>

      <div className="panel border-down/30 p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-down">
          <AlertTriangle size={15} /> Danger Zone
        </h2>
        <p className="mt-1 text-xs text-ink-muted">
          Menghapus seluruh sinyal, journal, dan statistik, lalu mengembalikan wallet ke $10,000. Tidak bisa dibatalkan.
        </p>
        <button
          onClick={handleReset}
          disabled={resetting}
          className={`mt-3 rounded-md border px-3.5 py-2 text-xs font-medium disabled:opacity-50 ${
            confirmReset ? "border-down bg-down/15 text-down" : "border-line text-ink-muted hover:border-down/40 hover:text-down"
          }`}
        >
          {resetting ? "Mereset…" : confirmReset ? "Klik lagi untuk konfirmasi reset" : "Reset Paper Trader"}
        </button>
      </div>
    </div>
  );
}
