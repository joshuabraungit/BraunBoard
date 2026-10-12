// Helpers for the hourly runner: New York time, and once-per-day claims.
import type { SupabaseClient } from "@supabase/supabase-js";

export function nyNow(now = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", weekday: "short", hour12: false })
      .formatToParts(now)
      .map((x) => [x.type, x.value]),
  );
  return { date: `${p.year}-${p.month}-${p.day}`, hour: +p.hour! % 24, weekday: p.weekday! };
}

/** Claim a once-per-key slot. Returns true only for the first caller. */
export async function claimRun(db: SupabaseClient, job: string, key: string): Promise<boolean> {
  const { error } = await db.from("scheduled_runs").insert({ job, run_key: key });
  if (!error) return true;
  if (error.code === "23505") return false; // already claimed
  throw new Error(`claimRun ${job}/${key}: ${error.message}`);
}
