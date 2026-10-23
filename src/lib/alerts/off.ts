// "Turn off these alerts" links. The link carries a signed code, so it works without signing in
// and nobody can build one for someone else's watch.
import { createHmac, timingSafeEqual } from "node:crypto";

const secret = () => process.env.ALERTS_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const b64 = (s: string) => Buffer.from(s).toString("base64url");
const sig = (body: string) => createHmac("sha256", secret()).update(`alerts-off:${body}`).digest("base64url").slice(0, 22);

/** watchId null = the email was for watched companies, which go out under the person's own settings. */
export function offToken(userId: string, watchId: string | null): string {
  const body = b64(`${userId}.${watchId ?? "companies"}`);
  return `${body}.${sig(body)}`;
}

export function readOffToken(token: string | null | undefined): { userId: string; watchId: string | null } | null {
  if (!token || !secret()) return null;
  const [body, s] = token.split(".");
  if (!body || !s) return null;
  const want = Buffer.from(sig(body));
  const got = Buffer.from(s);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  const [userId, w] = Buffer.from(body, "base64url").toString().split(".");
  if (!userId || !w) return null;
  return { userId, watchId: w === "companies" ? null : w };
}

export const offUrl = (siteUrl: string, userId: string, watchId: string | null) => `${siteUrl}/alerts/off?t=${offToken(userId, watchId)}`;
