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
