// One-time (and repeatable) backfill: run AI extraction on stored jobs that don't have
// a summary yet. New jobs get this automatically during ingest.
// Usage: npm run backfill -- [limit]   (default 3000)

import { adminClient } from "../src/lib/supabase/admin";
import { classifyTitle } from "../src/lib/ingest/classify";
import { extractAttributes, lastExtractionError } from "../src/lib/ingest/extract";
import { fail, notice, requireEnv } from "./report";

async function main() {
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY");
  const limit = Number(process.argv[2]) || 3000;
  const db = adminClient();

  // Supabase returns at most 1000 rows per request, so page through.
  const jobs: { id: string; title_raw: string; description_raw: string | null; sales_segment: string; classification_overridden: boolean }[] = [];
  for (let from = 0; jobs.length < limit; from += 1000) {
    const { data, error } = await db
      .from("jobs")
      .select("id, title_raw, description_raw, sales_segment, classification_overridden")
      .is("summary", null)
      .eq("is_active", true)
      .is("duplicate_of", null)
      .order("first_seen_at", { ascending: false })
      .order("id")
      .range(from, Math.min(from + 999, limit - 1));
    if (error) fail(error);
    jobs.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  if (!jobs.length) return notice("Backfill: nothing to do, every active job has a summary");

  let done = 0;
  let failed = 0;
  let firstError = "";
  const queue = [...jobs];

  const worker = async () => {
    for (let j = queue.shift(); j; j = queue.shift()) {
      const cls = classifyTitle(j.title_raw);
      if (!cls) continue;
      const a = await extractAttributes(j.title_raw, j.description_raw ?? "", cls);
      if (!a.summary) {
        failed++;
        // Bail early if nothing works (bad key, wrong model name, no credits)
        if (done === 0 && failed >= 5) fail(new Error(`AI extraction failed on the first 5 jobs. Last error: ${lastExtractionError}`));
        continue;
      }
      const update: Record<string, unknown> = {
        summary: a.summary,
        disclosures: a.disclosures,
        sales_motion: a.sales_motion,
        self_sourcing_level: a.self_sourcing_level,
        customer_segment: a.customer_segment,
      };
      if (!j.classification_overridden && j.sales_segment === "Unknown") update.sales_segment = a.sales_segment;
      const { error: upErr } = await db.from("jobs").update(update).eq("id", j.id);
      if (upErr) {
        failed++;
        firstError ||= upErr.message;
      } else done++;
      if ((done + failed) % 100 === 0) console.log(`${done} done, ${failed} failed, ${queue.length} left`);
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  notice(`Backfill: ${done} jobs summarized, ${failed} failed${firstError ? ` (first error: ${firstError})` : ""}`);
}

main().catch(fail);
