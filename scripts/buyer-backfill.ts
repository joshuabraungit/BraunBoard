// Fill "who you're selling to" for live jobs the AI hasn't checked yet.
// Runs every hour after the crawl (new jobs), and by hand once for everything already live.
// Usage: npx tsx scripts/buyer-backfill.ts [max jobs, default 300]

import { adminClient } from "../src/lib/supabase/admin";
import { extractBuyer } from "../src/lib/ingest/buyer";
import { fail, notice, requireEnv, warn } from "./report";

async function main() {
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY");
  const max = Number(process.argv[2] ?? 300);
  const db = adminClient();
  const { data: jobs, error } = await db
    .from("jobs")
    .select("id, title_raw, description_raw")
    .eq("is_active", true)
    .is("duplicate_of", null)
    .is("buyer_checked_at", null)
    .not("description_raw", "is", null)
    .order("posted_at", { ascending: false })
    .limit(max);
  if (error) throw error;

  let found = 0, industries = 0, errors = 0;
  let lastError = "";
  const list = jobs ?? [];
  for (let i = 0; i < list.length; i += 6) {
    await Promise.all(
      list.slice(i, i + 6).map(async (j) => {
        try {
          const r = await extractBuyer(j.title_raw as string, j.description_raw as string);
          if (r.buyer) found++;
          if (r.industry) industries++;
          await db.from("jobs").update({ ...r, buyer_checked_at: new Date().toISOString() }).eq("id", j.id);
        } catch (e) {
          // Left unchecked, so the next run tries again.
          errors++;
          lastError = (e as Error).message;
        }
      }),
    );
  }
  notice(`Who you're selling to: checked ${list.length - errors} jobs, buyer stated in ${found}, industry in ${industries}${errors ? `, ${errors} errors (will retry)` : ""}`);
  if (errors) warn(`Last buyer extraction error: ${lastError}`);
}

main().catch(fail);
