// Catch-up for jobs whose pay only shows on the company's own careers page (Stripe).
// New jobs get it as they come in; this fills in the ones already listed.
// Usage: npx tsx scripts/site-pay-backfill.ts [--dry-run]

import { adminClient } from "../src/lib/supabase/admin";
import { resolveCompensation, payCurrency } from "../src/lib/ingest/compensation";
import { fetchSitePayText } from "../src/lib/ingest/site-pay";
import { recomputeFlags } from "../src/lib/flags-db";
import { requireEnv } from "./report";

const COMPANIES = ["stripe"];

async function main() {
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");
  const dry = process.argv.includes("--dry-run");
  const db = adminClient();
  const { data: cos, error: ce } = await db.from("companies").select("id, name, ats_identifier").in("ats_identifier", COMPANIES).eq("ats_provider", "greenhouse");
  if (ce) throw ce;
  let found = 0;
  let missed = 0;
  for (const co of cos ?? []) {
    const { data: jobs, error } = await db
      .from("jobs")
      .select("id, title_raw, source_job_id, description_raw, markets, salary_min, ote_min")
      .eq("company_id", co.id)
      .eq("is_active", true);
    if (error) throw error;
    for (const j of jobs ?? []) {
      // US jobs only: the page gives the US range.
      if (!((j.markets as string[] | null) ?? ["US"]).includes("US")) continue;
      if (j.salary_min != null || j.ote_min != null) continue;
      const site = await fetchSitePayText(co.ats_identifier as string, j.source_job_id as string, j.title_raw as string);
      await new Promise((r) => setTimeout(r, 400)); // be polite to their site
      const text = `${j.description_raw ?? ""}\n\n${site ?? ""}`;
      const c = resolveCompensation({ min: null, max: null, currency: null }, text, "$");
      if (c.salary_min == null && c.ote_min == null) {
        missed++;
        console.log(`  no pay found · ${co.name} · ${j.title_raw}${site ? "" : " (page not read)"}`);
        continue;
      }
      found++;
      const pay = `${c.salary_min ? `base ${c.salary_min}-${c.salary_max} ` : ""}${c.ote_min ? `OTE ${c.ote_min}-${c.ote_max}` : ""}`;
      console.log(`  ${co.name} · ${j.title_raw} · ${pay}`);
      if (dry) continue;
      const { error: ue } = await db
        .from("jobs")
        .update({ ...c, currency: payCurrency(null, text, ["US"]) })
        .eq("id", j.id);
      if (ue) throw ue;
    }
  }
  console.log(`${found} jobs got pay, ${missed} still have none${dry ? " (dry run, nothing saved)" : ""}.`);
  if (!dry && found) console.log(await recomputeFlags(db));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
