"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Settings, BookOpen, ChevronDown, CircleUser, Zap, Wallet as WalletIcon, LogOut, Loader2 } from "lucide-react";
import clsx from "clsx";
import { useTokenAnalyzer } from "@/components/token-analyzer/TokenAnalyzerContext";
import { AlertsBell } from "@/components/alerts/AlertsBell";
import { formatUsd, formatPct, timeUntil, shortAddr } from "@/lib/format";
import { createSupabaseBrowserClient } from "@/lib/auth/client";
import { WALLET_TYPE_LABEL, type WalletType } from "@/lib/wallet/connectors";

interface TickerRow {
  symbol: string;
  price: number | null;
  change24h: number | null;
}

interface MeResponse {
  signedIn: boolean;
  user?: { email: string } | null;
  profile?: { username: string | null; avatarUrl: string | null } | null;
  energy?: { balance: number; nextResetAt: string } | null;
  wallet?: { wallet_address: string; wallet_type: WalletType; chain_id: number } | null;
}

export function TopNav() {
  const router = useRouter();
  const { open } = useTokenAnalyzer();
  const [query, setQuery] = useState("");
  const [ticker, setTicker] = useState<TickerRow[]>([
    { symbol: "BTC", price: null, change24h: null },
    { symbol: "ETH", price: null, change24h: null },
    { symbol: "SOL", price: null, change24h: null },
  ]);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch("/api/account/me")
      .then((r) => (r.ok ? r.json() : { signedIn: false }))
      .then(setMe)
      .catch(() => setMe({ signedIn: false }));
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // createSupabaseBrowserClient() throws if Supabase Auth isn't
      // configured — nothing to sign out of in that case, fall through to
      // the redirect below regardless.
    } finally {
      setLoggingOut(false);
      setProfileOpen(false);
      router.push("/login");
      router.refresh();
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/ticker");
        const data = await res.json();
        if (!cancelled) setTicker(data.ticker);
      } catch {
        /* keep last known values */
      }
    }
    poll();
    const id = setInterval(poll, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const symbol = query.trim().toUpperCase();
    if (symbol) {
      open(symbol);
      setQuery("");
    }
  }

  return (
    <header className="fixed inset-x-0 top-0 z-40 hidden h-14 border-b border-line bg-bg/95 backdrop-blur lg:flex">
      <div className="flex w-full items-center gap-6 px-5">
        <Link href="/dashboard" className="flex shrink-0 items-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-signal animate-pulseGlow" />
          <div className="leading-tight">
            <p className="eyebrow text-[9px] tracking-[0.18em] text-ink-faint">ElVoid AI Engine</p>
            <span className="text-sm font-bold tracking-tight">ELSTAND INTELLIGENCE</span>
          </div>
        </Link>

        <form onSubmit={handleSearch} className="max-w-md flex-1">
          <div className="flex items-center gap-2 rounded-md border border-line bg-bg-surface px-3 py-1.5 transition-colors focus-within:border-signal/50">
            <Search size={14} className="shrink-0 text-ink-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search coin / Ask ElVoid AI…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-ink-faint"
            />
          </div>
        </form>

        <div className="mono-num flex shrink-0 items-center gap-4 text-xs">
          {ticker.map((t) => (
            <div key={t.symbol} className="flex items-baseline gap-1.5">
              <span className="font-semibold text-ink-faint">{t.symbol}</span>
              <span className="text-ink">{t.price !== null ? formatUsd(t.price) : "—"}</span>
              {t.change24h !== null && (
                <span className={t.change24h >= 0 ? "text-up" : "text-down"}>{formatPct(t.change24h)}</span>
              )}
            </div>
          ))}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <AlertsBell />
          <div ref={profileRef} className="relative">
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-md border border-line px-2 py-1 text-ink-muted hover:border-signal/40 hover:text-ink"
            >
              {me?.profile?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- external Google avatar URL
                <img src={me.profile.avatarUrl} alt="" className="h-6 w-6 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <CircleUser size={18} />
              )}
              <ChevronDown size={12} className={clsx("transition-transform", profileOpen && "rotate-180")} />
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-[calc(100%+6px)] w-72 rounded-md border border-line bg-bg-raised py-1.5 shadow-2xl shadow-black/40">
                {me?.signedIn ? (
                  <>
                    <div className="flex items-center gap-2.5 px-3 py-2.5">
                      {me.profile?.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={me.profile.avatarUrl} alt="" className="h-9 w-9 shrink-0 rounded-full border border-line" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-bg-surface text-ink-faint">
                          <CircleUser size={18} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{me.profile?.username || "Trader"}</p>
                        <p className="truncate text-xs text-ink-faint">{me.user?.email}</p>
                      </div>
                    </div>

                    <div className="space-y-1.5 border-y border-line px-3 py-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-ink-muted">
                          <Zap size={12} className="text-signal-glow" /> AI Energy
                        </span>
                        <span className="mono-num text-ink">
                          {me.energy ? `${me.energy.balance} / 10` : "—"}
                          {me.energy && <span className="ml-1 text-ink-faint">· reset {timeUntil(me.energy.nextResetAt)}</span>}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-ink-muted">
                          <WalletIcon size={12} /> Wallet
                        </span>
                        {me.wallet ? (
                          <span className="mono-num flex items-center gap-1 text-ink">
                            <span className="h-1.5 w-1.5 rounded-full bg-up" />
                            {WALLET_TYPE_LABEL[me.wallet.wallet_type]} · {shortAddr(me.wallet.wallet_address)}
                          </span>
                        ) : (
                          <Link href="/settings#wallet" className="text-ink-faint underline decoration-line underline-offset-2 hover:text-ink-muted">
                            Not connected
                          </Link>
                        )}
                      </div>
                    </div>

                    <Link href="/settings" className="flex items-center gap-2 px-3 py-2 text-sm text-ink-muted hover:bg-bg-surface hover:text-ink">
                      <Settings size={14} /> Settings
                    </Link>
                    <Link href="/methodology" className="flex items-center gap-2 px-3 py-2 text-sm text-ink-muted hover:bg-bg-surface hover:text-ink">
                      <BookOpen size={14} /> Methodology
                    </Link>
                    <button
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="flex w-full items-center gap-2 border-t border-line px-3 py-2 text-left text-sm text-ink-muted hover:bg-down/10 hover:text-down disabled:opacity-50"
                    >
                      {loggingOut ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
                      {loggingOut ? "Signing out…" : "Logout"}
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/settings" className="flex items-center gap-2 px-3 py-2 text-sm text-ink-muted hover:bg-bg-surface hover:text-ink">
                      <Settings size={14} /> Settings
                    </Link>
                    <Link href="/methodology" className="flex items-center gap-2 px-3 py-2 text-sm text-ink-muted hover:bg-bg-surface hover:text-ink">
                      <BookOpen size={14} /> Methodology
                    </Link>
                    <Link href="/login" className="flex items-center gap-2 border-t border-line px-3 py-2 text-sm text-signal-glow hover:bg-bg-surface">
                      <CircleUser size={14} /> Sign in with Google
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
