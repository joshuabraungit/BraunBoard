// Rate limit for the job tools. Each run is a paid call to Claude, so: a cap per visitor
// (hashed IP) per hour, and one for the whole site per day that holds even if IPs rotate.
// Same shape as the résumé reader's limit. If the database is down, we let it through.
import "server-only";
import { createHash } from "node:crypto";
import { adminClient } from "../supabase/admin";
import { isSupabaseConfigured } from "../supabase/server";
import { resumeGate, type ResumeGate } from "../resume-limit";

export const TOOLS_PER_IP_HOUR = 15;
export const TOOLS_SITE_PER_DAY = () => Number(process.env.JOB_TOOLS_SITE_PER_DAY) || 400;

export type ToolName = "chatter" | "tune" | "letter" | "prep";

export async function claimToolRun(ip: string, tool: ToolName): Promise<ResumeGate> {
  if (!isSupabaseConfigured()) return "ok";
  try {
    const db = adminClient();
    const hash = createHash("sha256").update(`tools:${ip || "unknown"}`).digest("hex").slice(0, 32);
    const hourAgo = new Date(Date.now() - 3600_000).toISOString();
    const dayAgo = new Date(Date.now() - 86400_000).toISOString();
    const [byIp, site] = await Promise.all([
      db.from("job_tool_runs").select("id", { count: "exact", head: true }).eq("ip_hash", hash).gte("created_at", hourAgo),
      db.from("job_tool_runs").select("id", { count: "exact", head: true }).gte("created_at", dayAgo),
    ]);
    if (byIp.error || site.error) throw byIp.error ?? site.error;
    const gate = resumeGate(byIp.count ?? 0, site.count ?? 0, TOOLS_PER_IP_HOUR, TOOLS_SITE_PER_DAY());
    if (gate === "busy") console.warn("[tools] site-wide daily cap hit");
    if (gate !== "ok") return gate;
    const { error } = await db.from("job_tool_runs").insert({ ip_hash: hash, tool });
    if (error) throw error;
    return "ok";
  } catch (e) {
    console.error("[tools] rate limit check failed, letting it through:", e instanceof Error ? e.message : e);
    return "ok";
  }
}
