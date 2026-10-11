// Lands here after the email link or Google sign-in. Exchanges the code for a
// session, then adopts any anonymous onboarding answers as the primary watch.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { EmailOtpType } from "@supabase/supabase-js";
import { serverClient } from "@/lib/supabase/server";
import { decodeWatchCookie, ONBOARDING_COOKIE } from "@/lib/watch-prefs";
import { upsertPrimaryWatch } from "@/lib/watches-db";

function safeNext(n: string | null): string {
  return n && n.startsWith("/") && !n.startsWith("//") ? n : "/for-you";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  const db = await serverClient();
  const { error } = code
    ? await db.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await db.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("missing code") };
  if (error) return NextResponse.redirect(`${url.origin}/login?error=link`);

  const { data } = await db.auth.getUser();
  const jar = await cookies();
  const pending = decodeWatchCookie(jar.get(ONBOARDING_COOKIE)?.value);
  if (data.user && pending) {
    // Don't clobber a watch they already have from another device.
    const { count } = await db.from("watches").select("id", { count: "exact", head: true }).eq("user_id", data.user.id);
    if (!count) await upsertPrimaryWatch(data.user.id, pending);
    jar.delete(ONBOARDING_COOKIE);
  }
  return NextResponse.redirect(`${url.origin}${next}`);
}
