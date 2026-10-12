// After ingestion, score each new job against every watch and record matches.
// Sending happens separately (send.ts) so instant vs daily can share one path.

import type { SupabaseClient } from "@supabase/supabase-js";
import { openInCountries, scoreMatch, shouldAlert, type MatchableJob, type WatchPrefs } from "../match";

export async function matchNewJobs(db: SupabaseClient, jobIds: string[]): Promise<number> {
  const { data: jobs } = await db
    .from("jobs")
    .select(
      "id, company_id, title_raw, role_family, sales_segment, sales_motion, self_sourcing_level, remote_type, city, state, salary_min, salary_max, ote_min, ote_max, currency, markets, description_raw, companies(employee_range)",
    )
    .in("id", jobIds);
  if (!jobs?.length) return 0;

  const { data: watches } = await db.from("watches").select("*").neq("alert_frequency", "off");
  const companyIds = [...new Set(jobs.map((j) => j.company_id))];
  const { data: companyWatches } = await db.from("company_watches").select("user_id, company_id").in("company_id", companyIds);

  const rows: Record<string, unknown>[] = [];
  for (const j of jobs) {
    const job: MatchableJob = {
      ...(j as unknown as MatchableJob),
      company_employee_range: (j.companies as unknown as { employee_range: string | null } | null)?.employee_range ?? null,
    };
    // Best match per user wins (unique on user_id + job_id)
    const best = new Map<string, Record<string, unknown>>();
    for (const w of watches ?? []) {
      if (!openInCountries(job, w as unknown as WatchPrefs)) continue;
      const m = scoreMatch(job, w as unknown as WatchPrefs);
      if (!shouldAlert(m)) continue;
      const prev = best.get(w.user_id);
      if (!prev || (prev.match_score as number) < m.score!) {
        best.set(w.user_id, { user_id: w.user_id, job_id: j.id, watch_id: w.id, match_score: m.score });
      }
    }
    // Company watches always alert on a new sales role from that company.
    for (const cw of companyWatches ?? []) {
      if (cw.company_id !== j.company_id) continue;
      const prev = best.get(cw.user_id);
      best.set(cw.user_id, { user_id: cw.user_id, job_id: j.id, watch_id: prev?.watch_id ?? null, match_score: prev?.match_score ?? null, company_watch: true });
    }
    rows.push(...best.values());
  }

  if (rows.length) await db.from("alert_matches").upsert(rows, { onConflict: "user_id,job_id", ignoreDuplicates: true });
  return rows.length;
}
