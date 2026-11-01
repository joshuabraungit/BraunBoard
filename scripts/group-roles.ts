// One role posted in several cities: link the copies to the first posting (jobs.role_group).
// New jobs are linked by the crawler as they come in; this catches up on jobs already stored.
// Usage: npx tsx scripts/group-roles.ts [--dry-run]

import { adminClient } from "../src/lib/supabase/admin";
import { sameRole } from "../src/lib/ingest/dedupe";
import { notice, requireEnv } from "./report";

interface Row {
  id: string;
  company_id: string;
  company_name: string;
  title_raw: string;
  title_normalized: string;
  markets: string[] | null;
  remote_type: string;
  posted_at: string | null;
  first_seen_at: string;
  description_raw: string | null;
  city: string | null;
  location_raw: string | null;
  role_group: string | null;
}

async function main() {
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");
  const dry = process.argv.includes("--dry-run");
  const db = adminClient();

  const rows: Row[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await db
      .from("jobs")
      .select("id, company_id, title_raw, title_normalized, markets, remote_type, posted_at, first_seen_at, description_raw, city, location_raw, role_group, companies(name)")
      .eq("is_active", true)
      .is("duplicate_of", null)
      .order("id")
      .range(from, from + 499);
    if (error) throw error;
    for (const r of data ?? []) rows.push({ ...(r as unknown as Row), company_name: (r as { companies?: { name?: string } }).companies?.name ?? "" });
    if ((data ?? []).length < 500) break;
  }

  // Group by company + normalized title, oldest first so the first posting becomes the root.
  const buckets = new Map<string, Row[]>();
  for (const r of rows) {
    const k = `${r.company_id}|${r.title_normalized}`;
    buckets.set(k, [...(buckets.get(k) ?? []), r]);
  }

  const updates: { id: string; role_group: string | null }[] = [];
  const examples: string[] = [];
  for (const list of buckets.values()) {
    if (list.length < 2) continue;
    list.sort((a, b) => a.first_seen_at.localeCompare(b.first_seen_at) || a.id.localeCompare(b.id));
    const roots: Row[] = [];
    for (const r of list) {
      const cand = (x: Row) => ({
        title: x.title_raw,
        title_normalized: x.title_normalized,
        markets: x.markets ?? [],
        remote_type: x.remote_type,
        posted_at: x.posted_at,
        description: x.description_raw ?? "",
        places: [x.city ?? "", x.location_raw ?? ""],
      });
      // Same city twice is a separate opening, not a copy, so only match a root in another place.
      const root = roots.find((o) => (o.city ?? o.location_raw) !== (r.city ?? r.location_raw) && sameRole(cand(r), cand(o)));
      const want = root ? root.id : null;
      if (!root) roots.push(r);
      if (want !== r.role_group) {
        updates.push({ id: r.id, role_group: want });
        if (want && examples.length < 15) examples.push(`${r.company_name} · ${r.title_raw} · ${r.city ?? r.location_raw} -> same role as ${root!.city ?? root!.location_raw}`);
      }
    }
  }

  const linked = updates.filter((u) => u.role_group).length;
  console.log(`${rows.length} active jobs. ${linked} copies of a role in another city, ${updates.length - linked} unlinked.`);
  for (const e of examples) console.log(`  ${e}`);
  if (dry) return;

  for (const u of updates) {
    const { error } = await db.from("jobs").update({ role_group: u.role_group }).eq("id", u.id);
    if (error) throw error;
  }
  notice(`Linked ${linked} multi-city copies to their first posting.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
