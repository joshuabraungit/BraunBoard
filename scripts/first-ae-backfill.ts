// Catch-up: tag current AE jobs that are open to a first-time AE. New jobs are checked by the crawler.
// Usage: npx tsx scripts/first-ae-backfill.ts [--dry-run]

import { adminClient } from "../src/lib/supabase/admin";
import { firstAe, mightBeFirstAe } from "../src/lib/ingest/first-ae";
import { notice, requireEnv, warn } from "./report";

type Job = { id: string; title_raw: string; description_raw: string | null; role_family: string | null; companies: { name: string } | null };

async function main() {
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY");
  const dry = process.argv.includes("--dry-run");
  const db = adminClient();
  const jobs: Job[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("jobs")
      .select("id, title_raw, description_raw, role_family, companies(name)")
      .eq("is_active", true)
      .is("first_ae_checked_at", null)
      .order("id")
      .range(from, from + 999);
    if (error) throw error;
    jobs.push(...((data ?? []) as unknown as Job[]));
    if (!data || data.length < 1000) break;
  }
  const hits = jobs.filter((j) => mightBeFirstAe(j.title_raw, j.description_raw ?? "", j.role_family));
  const now = new Date().toISOString();

  // Can't qualify (not an AE role, senior title, nothing about experience): mark checked without asking the AI.
  if (!dry) {
    const misses = jobs.filter((j) => !hits.includes(j)).map((j) => j.id);
    for (let i = 0; i < misses.length; i += 200) {
      const { error } = await db.from("jobs").update({ first_ae_checked_at: now }).in("id", misses.slice(i, i + 200));
      if (error) throw error;
    }
  }

  let found = 0;
  let errors = 0;
  const queue = [...hits];
  const worker = async () => {
    for (let j = queue.shift(); j; j = queue.shift()) {
      try {
        const r = await firstAe(j.title_raw, j.description_raw ?? "", j.role_family);
        if (r.first_ae) found++;
        console.log(`${r.first_ae ? "FIRST AE" : "no      "} ${j.companies?.name} · ${j.title_raw}${r.quote ? `  «${r.quote.slice(0, 120)}»` : ""}`);
        if (dry) continue;
        const { error } = await db
          .from("jobs")
          .update({ first_ae: r.first_ae, first_ae_quote: r.quote, first_ae_checked_at: now })
          .eq("id", j.id);
        if (error) throw error;
      } catch (e) {
        errors++;
        warn(`${j.companies?.name} · ${j.title_raw}: ${(e as Error).message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  notice(`${dry ? "Dry run: " : ""}${jobs.length} jobs checked, ${hits.length} could qualify, ${found} tagged First AE job${errors ? `, ${errors} errors (will retry)` : ""}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
