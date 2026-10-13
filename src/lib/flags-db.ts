// Recompute stored flag codes for every visible job. Cheap (pure regex), so it runs
// after every ingest and backfill and keeps cards in sync with the current rules.
import type { SupabaseClient } from "@supabase/supabase-js";
import { computeFlags, type FlagInput } from "./flags";

export async function recomputeFlags(db: SupabaseClient): Promise<{ checked: number; changed: number }> {
  let checked = 0;
  let changed = 0;
  // How many open postings share each company + title.
  const sameTitle = new Map<string, number>();
  for (let from = 0; ; from += 1000) {
    const { data } = await db.from("visible_jobs").select("company_id, title_normalized").order("id").range(from, from + 999);
    for (const r of data ?? []) {
      const k = `${r.company_id}|${r.title_normalized}`;
      sameTitle.set(k, (sameTitle.get(k) ?? 0) + 1);
    }
    if (!data || data.length < 1000) break;
  }
  for (let from = 0; ; from += 500) {
    const { data, error } = await db
      .from("visible_jobs")
      .select("id, flags, description_raw, salary_min, salary_max, ote_min, ote_max, self_sourcing_level, disclosures, role_family, company_id, title_normalized, first_seen_at:posted_at")
      .order("id")
      .range(from, from + 499);
    if (error) throw new Error(`recomputeFlags: ${error.message}`);
    const rows = (data ?? []) as (FlagInput & { id: string; flags: string[]; company_id: string; title_normalized: string })[];
    const updates = rows
      .map((r) => ({
        id: r.id,
        old: r.flags ?? [],
        next: computeFlags({ ...r, same_title_open: sameTitle.get(`${r.company_id}|${r.title_normalized}`) ?? 1 }).map((f) => f.code),
      }))
      .filter((u) => u.old.join() !== u.next.join());
    for (let i = 0; i < updates.length; i += 20) {
      await Promise.all(updates.slice(i, i + 20).map((u) => db.from("jobs").update({ flags: u.next }).eq("id", u.id)));
    }
    checked += rows.length;
    changed += updates.length;
    if (rows.length < 500) break;
  }
  return { checked, changed };
}
