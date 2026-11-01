// Catch-up for jobs stored before the crawler learned to read a foreign location out of the
// posting text (a Seoul job filed as "United States"). New jobs are checked as they come in.
// Usage: npx tsx scripts/hide-abroad.ts [--dry-run]

import { adminClient } from "../src/lib/supabase/admin";
import { descriptionPlacesRoleAbroad, type Market } from "../src/lib/ingest/location";
import { notice, requireEnv } from "./report";

async function main() {
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");
  const dry = process.argv.includes("--dry-run");
  const db = adminClient();
  const hits: { id: string; line: string }[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await db
      .from("visible_jobs")
      .select("id, company_name, title_raw, location_raw, markets, description_raw")
      .is("city", null)
      .order("id")
      .range(from, from + 499);
    if (error) throw error;
    for (const j of data ?? []) {
      const c = descriptionPlacesRoleAbroad((j.description_raw as string) ?? "", (j.markets as Market[]) ?? []);
      if (c) hits.push({ id: j.id as string, line: `${j.company_name} · ${j.title_raw} · listed as "${j.location_raw}" · text says ${c}` });
    }
    if ((data ?? []).length < 500) break;
  }
  console.log(`${hits.length} jobs whose posting puts them outside our countries:`);
  for (const h of hits) console.log(`  ${h.line}`);
  if (dry || !hits.length) return;
  const { error } = await db.from("jobs").update({ is_active: false, removed_at: new Date().toISOString() }).in("id", hits.map((h) => h.id));
  if (error) throw error;
  notice(`Hid ${hits.length} jobs that are really outside the US, Canada, UK and Germany.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
