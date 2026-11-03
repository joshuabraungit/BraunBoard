// Unsubscribe links for one-off emails. Signed, so nobody can unsubscribe someone else.
import { createHmac, timingSafeEqual } from "node:crypto";
import { adminClient } from "./supabase/admin";

const secret = () => process.env.ALERTS_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const sig = (body: string) => createHmac("sha256", secret()).update(`email-optout:${body}`).digest("base64url").slice(0, 22);

export function optoutToken(email: string): string {
  const body = Buffer.from(email.trim().toLowerCase()).toString("base64url");
  return `${body}.${sig(body)}`;
}

export function readOptoutToken(token: string | null | undefined): string | null {
  if (!token || !secret()) return null;
  const [body, s] = token.split(".");
  if (!body || !s) return null;
  const want = Buffer.from(sig(body));
  const got = Buffer.from(s);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  const email = Buffer.from(body, "base64url").toString();
  return email.includes("@") ? email : null;
}

export async function optOut(token: string | null | undefined): Promise<boolean> {
  const email = readOptoutToken(token);
  if (!email) return false;
  await adminClient().from("email_optouts").upsert({ email }, { onConflict: "email" });
  return true;
}

export const optoutUrl = (siteUrl: string, email: string) => `${siteUrl}/email/unsubscribe?t=${optoutToken(email)}`;
export const optoutOneClick = (siteUrl: string, email: string) => `${siteUrl}/api/email/unsubscribe?t=${optoutToken(email)}`;
