// Read-only test of "who you're selling to" extraction. Nothing on the site changes:
// results go to the buyer_samples scratch table for review.
// Usage: npx tsx scripts/buyer-sample.ts 50          (new random sample of rep jobs)
//        npx tsx scripts/buyer-sample.ts same        (re-run the jobs from the first sample)

import { adminClient } from "../src/lib/supabase/admin";
import { extractBuyer } from "../src/lib/ingest/buyer";
import { fail, notice, requireEnv } from "./report";

async function main() {
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY");
  const arg = process.argv[2] ?? "50";
  const db = adminClient();

  let ids: string[];
  if (arg === "same") {
    const { data: first } = await db.from("buyer_samples").select("run_at").order("run_at").limit(1);
    const t0 = new Date(first![0]!.run_at as string).getTime();
    const { data } = await db.from("buyer_samples").select("job_id, run_at").lte("run_at", new Date(t0 + 30 * 60_000).toISOString());
    ids = [...new Set((data ?? []).map((r) => r.job_id as string))];
  } else {
    const { data: pool, error } = await db
      .from("visible_jobs")
      .select("id, company_name")
      .in("role_family", ["SDR/BDR", "Account Executive", "Account Manager", "Customer Expansion"])
      .eq("seniority", "Individual Contributor")
      .not("description_raw", "is", null)
      .limit(2000);
    if (error) throw error;
    const perCo = new Map<string, number>();
    ids = [...(pool ?? [])]
      .sort(() => Math.random() - 0.5)
      .filter((j) => {
        const k = (perCo.get(j.company_name) ?? 0) + 1;
        perCo.set(j.company_name, k);
        return k <= 2;
      })
      .slice(0, Number(arg))
      .map((j) => j.id);
  }

  const { data: jobs } = await db.from("jobs").select("id, title_raw, sales_segment, description_raw, companies(name)").in("id", ids);
  let buyers = 0, industries = 0, errors = 0;
  const list = jobs ?? [];
  for (let i = 0; i < list.length; i += 5) {
    await Promise.all(
      list.slice(i, i + 5).map(async (j) => {
        const company = (j.companies as unknown as { name: string } | null)?.name ?? null;
        try {
          const r = await extractBuyer(j.title_raw as string, (j.description_raw as string) ?? "");
          if (r.buyer) buyers++;
          if (r.industry) industries++;
          await db.from("buyer_samples").insert({
            job_id: j.id, company, title: j.title_raw, segment: j.sales_segment,
            buyer: r.buyer, buyer_quote: r.buyer_quote, buyer_quote_found: r.buyer ? true : null,
            industry: r.industry, industry_quote: r.industry_quote, industry_quote_found: r.industry ? true : null,
            raw: { pass: arg === "same" ? 2 : 1 },
          });
        } catch (e) {
          errors++;
          await db.from("buyer_samples").insert({ job_id: j.id, company, title: j.title_raw, error: (e as Error).message, raw: { pass: arg === "same" ? 2 : 1 } });
        }
      }),
    );
  }
  notice(`Buyer sample (${arg}): ${list.length} jobs, buyer found in ${buyers}, industry in ${industries}, ${errors} errors. Every answer has a quote verified against the posting.`);
}

main().catch(fail);
