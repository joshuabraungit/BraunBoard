// Recompute stored flag codes for every visible job. Cheap (pure regex), so it runs
// after every ingest and backfill and keeps cards in sync with the current rules.
import type { SupabaseClient } from "@supabase/supabase-js";
import { computeFlags, type FlagInput } from "./flags";

export async function recomputeFlags(db: SupabaseClient): Promise<{ checked: number; changed: number }> {
  let checked = 0;
  let changed = 0;
  for (let from = 0; ; from += 500) {
    const { data, error } = await db
      .from("visible_jobs")
      .select("id, flags, description_raw, salary_min, salary_max, ote_min, ote_max, self_sourcing_level, disclosures")
      .order("id")
      .range(from, from + 499);
    if (error) throw new Error(`recomputeFlags: ${error.message}`);
    const rows = (data ?? []) as (FlagInput & { id: string; flags: string[] })[];
    const updates = rows
      .map((r) => ({ id: r.id, old: r.flags ?? [], next: computeFlags(r).map((f) => f.code) }))
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
