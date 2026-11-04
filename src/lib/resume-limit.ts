// Rate limit for the résumé reader. Every read is a paid call to Claude, and the
// upload is open to anyone, so a bot could loop it and run up the bill.
// Two caps: one per visitor (hashed IP) and one for the whole site per day,
// which still holds if someone rotates IPs.
import "server-only";
import { createHash } from "node:crypto";
import { adminClient } from "./supabase/admin";
import { isSupabaseConfigured } from "./supabase/server";

export const RESUME_PER_IP_HOUR = 5;
export const RESUME_SITE_PER_DAY = Number(process.env.RESUME_SITE_PER_DAY) || 300;

export type ResumeGate = "ok" | "slow" | "busy";

/** Pure decision, so it's easy to test. */
export function resumeGate(byIpLastHour: number, siteLastDay: number, perIp = RESUME_PER_IP_HOUR, perSite = RESUME_SITE_PER_DAY): ResumeGate {
  if (byIpLastHour >= perIp) return "slow";
  if (siteLastDay >= perSite) return "busy";
  return "ok";
}

export const resumeIpHash = (ip: string) => createHash("sha256").update(`resume:${ip || "unknown"}`).digest("hex").slice(0, 32);

/**
 * Checks the caps and, if the read is allowed, records it. If the database is down
 * we let the read through: the site shouldn't break for a real person over a counter.
 */
export async function claimResumeRead(ip: string): Promise<ResumeGate> {
  if (!isSupabaseConfigured()) return "ok";
  try {
    const db = adminClient();
    const hash = resumeIpHash(ip);
    const hourAgo = new Date(Date.now() - 3600_000).toISOString();
    const dayAgo = new Date(Date.now() - 86400_000).toISOString();
    const [byIp, site] = await Promise.all([
      db.from("resume_reads").select("id", { count: "exact", head: true }).eq("ip_hash", hash).gte("created_at", hourAgo),
      db.from("resume_reads").select("id", { count: "exact", head: true }).gte("created_at", dayAgo),
    ]);
    if (byIp.error || site.error) throw byIp.error ?? site.error;
    const gate = resumeGate(byIp.count ?? 0, site.count ?? 0);
    if (gate === "busy") console.warn("[resume] site-wide daily cap hit");
    if (gate !== "ok") return gate;
    const { error } = await db.from("resume_reads").insert({ ip_hash: hash });
    if (error) throw error;
    return "ok";
  } catch (e) {
    console.error("[resume] rate limit check failed, letting it through:", e instanceof Error ? e.message : e);
    return "ok";
  }
}
