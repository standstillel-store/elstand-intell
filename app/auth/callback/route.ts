import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { upsertUserProfile } from "@/lib/auth/profile";
import { logActivity, touchDevice } from "@/lib/activityLog";
import { parseDeviceLabel } from "@/lib/device";

// Google → Supabase redirects here with ?code=... after the consent screen.
// We exchange that code for a session (sets the sb-* cookies), provision
// this user's rows (users/profiles/ai_token/user_settings/devices —
// see lib/auth/profile.ts), log the login, then hand off to
// /auth/success for the brief "signed in" animation before landing on
// wherever the user was headed (next — /dashboard by default).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const cookieStore = cookies();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (url && anonKey) {
      const supabase = createServerClient(url, anonKey, {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: "", ...options });
          },
        },
      });

      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && data.user) {
        // Best-effort provisioning — a failure here shouldn't strand the user
        // on an error page when their session cookie is already valid.
        await upsertUserProfile(supabase, data.user);

        const userAgent = request.headers.get("user-agent") ?? "";
        const deviceLabel = parseDeviceLabel(userAgent);
        await Promise.all([
          touchDevice(supabase, data.user.id, deviceLabel, userAgent),
          logActivity(supabase, data.user.id, "login", { device: deviceLabel }),
        ]);

        const successUrl = new URL("/auth/success", origin);
        successUrl.searchParams.set("next", next);
        return NextResponse.redirect(successUrl);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
