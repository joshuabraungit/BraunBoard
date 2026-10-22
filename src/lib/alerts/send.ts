// Sends pending alert matches. Run "instant" after every ingest cycle and
// "daily" once a morning. Each email groups matches by watch.

import type { SupabaseClient } from "@supabase/supabase-js";
import { renderAlert, sendEmail, type AlertItem } from "./email";
import { flagsFromCodes, isRedFlag } from "../flags";
import { FLAG_QUESTIONS } from "../questions";

export async function sendPendingAlerts(db: SupabaseClient, frequency: "instant" | "daily"): Promise<number> {
  const { data: pending, error } = await db
    .from("alert_matches")
    .select(
      "id, user_id, match_score, company_watch, watches(name, alert_frequency), jobs(slug, title_raw, salary_min, salary_max, ote_min, ote_max, currency, markets, remote_type, city, state, is_active, flags, disclosures, self_sourcing_level, role_family, seniority, buyer, buyer_checked_at, companies(name))",
    )
    .is("sent_at", null)
    .order("match_score", { ascending: false, nullsFirst: false });
  if (error) throw error;

  // Group by user + watch name
  const groups = new Map<string, { user_id: string; watch: string; items: AlertItem[]; ids: string[] }>();
  for (const m of pending ?? []) {
    const w = m.watches as unknown as { name: string; alert_frequency: string } | null;
    const j = m.jobs as unknown as {
      slug: string; title_raw: string; salary_min: number | null; salary_max: number | null;
      ote_min: number | null; ote_max: number | null; currency: string | null; markets: string[] | null; remote_type: string; city: string | null;
      state: string | null; is_active: boolean; companies: { name: string };
      flags: string[] | null; disclosures: Record<string, boolean> | null; self_sourcing_level: string; role_family: string;
      seniority: string; buyer: string | null; buyer_checked_at: string | null;
    } | null;
    if (!j?.is_active) continue;
    const freq = w?.alert_frequency ?? "daily"; // company-watch-only matches go in the digest
    if (freq !== frequency) continue;
    const watchName = w?.name ?? `${j.companies.name}`;
    const key = `${m.user_id}|${watchName}`;
    const g = groups.get(key) ?? { user_id: m.user_id as string, watch: watchName, items: [] as AlertItem[], ids: [] as string[] };
    g.items.push({
      match_id: m.id,
      job_slug: j.slug,
      title: j.title_raw,
      company: j.companies.name,
      score: m.match_score,
      salary_min: j.salary_min,
      salary_max: j.salary_max,
      ote_min: j.ote_min,
      ote_max: j.ote_max,
      currency: j.currency,
      remote_type: j.remote_type,
      location: [j.city, j.state].filter(Boolean).join(", ") || (j.markets?.includes("US") ? null : "Canada"),
      ...readFor(j),
    });
    g.ids.push(m.id);
    groups.set(key, g);
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  let sent = 0;
  for (const g of groups.values()) {
    const { data: profile } = await db.from("profiles").select("email").eq("id", g.user_id).single();
    if (!profile?.email) continue;
    await sendEmail(profile.email, renderAlert(g.watch, g.items.slice(0, 10), site));
    await db.from("alert_matches").update({ sent_at: new Date().toISOString() }).in("id", g.ids);
    sent++;
  }
  return sent;
}

/** The job's top red flags, each with the question that answers it. Generic questions live on the job page. */
function readFor(j: { flags: string[] | null }): { redFlags: string[]; questions: string[] } {
  const red = flagsFromCodes(j.flags).filter(isRedFlag).slice(0, 2);
  return { redFlags: red.map((f) => f.label), questions: red.map((f) => FLAG_QUESTIONS[f.code]?.text).filter((q): q is string => !!q) };
}
