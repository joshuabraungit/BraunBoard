// Subscribe / unsubscribe for Braun's Picks. Server-only (service role).
import { adminClient } from "./supabase/admin";

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) && s.length <= 254;
export const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

export async function subscribe(email: string, source: string): Promise<"ok" | "invalid"> {
  const e = email.trim().toLowerCase();
  if (!isEmail(e)) return "invalid";
  await adminClient()
    .from("picks_subscribers")
    .upsert({ email: e, status: "active", source, unsubscribed_at: null }, { onConflict: "email" });
  return "ok";
}

/**
 * Adds a new sign-in to Braun's Picks. Never re-subscribes someone who unsubscribed
 * (their row already exists, so it's left alone) or who opted out of Braun Board email.
 */
export async function subscribeOnSignIn(email: string | null | undefined): Promise<void> {
  const e = (email ?? "").trim().toLowerCase();
  if (!isEmail(e)) return;
  const db = adminClient();
  const { data: out } = await db.from("email_optouts").select("email").eq("email", e).maybeSingle();
  if (out) return;
  await db.from("picks_subscribers").upsert({ email: e, status: "active", source: "signin" }, { onConflict: "email", ignoreDuplicates: true });
}

export async function unsubscribe(id: string): Promise<string | null> {
  if (!isUuid(id)) return null;
  const { data } = await adminClient()
    .from("picks_subscribers")
    .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() })
    .eq("id", id)
    .select("email")
    .maybeSingle();
  return (data?.email as string) ?? null;
}
