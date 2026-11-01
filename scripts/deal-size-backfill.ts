// Catch-up: find the deal size in postings that mention one. New jobs are checked by the crawler.
// Usage: npx tsx scripts/deal-size-backfill.ts [--dry-run]

import { adminClient } from "../src/lib/supabase/admin";
import { DEAL_HINT, dealSize } from "../src/lib/ingest/deal-size";
import { notice, requireEnv, warn } from "./report";

type Job = { id: string; title_raw: string; description_raw: string | null; companies: { name: string } | null };

async function main() {
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY");
  const dry = process.argv.includes("--dry-run");
  const db = adminClient();
  const jobs: Job[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("jobs")
      .select("id, title_raw, description_raw, companies(name)")
      .eq("is_active", true)
      .is("deal_size_checked_at", null)
      .order("id")
      .range(from, from + 999);
    if (error) throw error;
    jobs.push(...((data ?? []) as unknown as Job[]));
    if (!data || data.length < 1000) break;
  }
  const hits = jobs.filter((j) => DEAL_HINT.test(j.description_raw ?? ""));
  const now = new Date().toISOString();

  // Postings with no deal-size amount at all: mark them checked without asking the AI.
  if (!dry) {
    const misses = jobs.filter((j) => !hits.includes(j)).map((j) => j.id);
    for (let i = 0; i < misses.length; i += 200) {
      const { error } = await db.from("jobs").update({ deal_size_checked_at: now }).in("id", misses.slice(i, i + 200));
      if (error) throw error;
    }
  }

  let found = 0;
  let errors = 0;
  const queue = [...hits];
  const worker = async () => {
    for (let j = queue.shift(); j; j = queue.shift()) {
      try {
        const size = await dealSize(j.title_raw, j.description_raw ?? "");
        if (size) found++;
        console.log(`${(size ?? "none").padEnd(14)} ${j.companies?.name} · ${j.title_raw}`);
        if (dry) continue;
        const { error } = await db.from("jobs").update({ deal_size: size, deal_size_checked_at: now }).eq("id", j.id);
        if (error) throw error;
      } catch (e) {
        errors++;
        warn(`${j.companies?.name} · ${j.title_raw}: ${(e as Error).message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  notice(`${dry ? "Dry run: " : ""}${jobs.length} jobs checked, ${hits.length} mention a deal amount, ${found} have a deal size${errors ? `, ${errors} errors (will retry)` : ""}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
