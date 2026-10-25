// Read-only test of "What they sell, in plain English". Nothing on the site changes:
// results go to the product_samples scratch table for review.
// Usage: npx tsx scripts/product-sample.ts 50     (new sample)
//        npx tsx scripts/product-sample.ts same   (re-run the companies from the first sample)

import { adminClient } from "../src/lib/supabase/admin";
import { extractProduct } from "../src/lib/ingest/product";
import { fail, notice, requireEnv } from "./report";

async function main() {
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY");
  const arg = process.argv[2] ?? "50";
  const n = arg === "same" || arg.startsWith("names=") ? 0 : Number(arg);
  const db = adminClient();
  const { data: jobs, error } = await db
    .from("visible_jobs")
    .select("company_id, company_name, title_raw, description_raw")
    .not("description_raw", "is", null)
    .limit(5000);
  if (error) throw error;

  // All postings per company; the AI reads the three longest.
  const best = new Map<string, { company_name: string; title_raw: string; postings: string[] }>();
  for (const j of jobs ?? []) {
    const cur = best.get(j.company_id) ?? { company_name: j.company_name as string, title_raw: j.title_raw as string, postings: [] };
    cur.postings.push(j.description_raw as string);
    best.set(j.company_id, cur);
  }
  const { data: cos } = await db.from("companies").select("id, industry").in("id", [...best.keys()]);
  const cat = new Map((cos ?? []).map((c) => [c.id as string, c.industry as string | null]));

  // Spread the sample across the old categories so we see every kind of product.
  const byCat = new Map<string, string[]>();
  for (const id of [...best.keys()].sort(() => Math.random() - 0.5)) {
    const k = cat.get(id) ?? "none";
    byCat.set(k, [...(byCat.get(k) ?? []), id]);
  }
  let picked: string[] = [];
  if (arg.startsWith("names=")) {
    // Named companies only, e.g. names=Stripe,Asana
    const want = new Set(arg.slice(6).split(",").map((x) => x.trim().toLowerCase()));
    picked = [...best.keys()].filter((id) => want.has(best.get(id)!.company_name.toLowerCase()));
  } else if (arg === "same") {
    const { data: first } = await db.from("product_samples").select("run_at").order("run_at").limit(1);
    const t0 = new Date(first![0]!.run_at as string).getTime();
    const { data: prev } = await db.from("product_samples").select("company_id").lte("run_at", new Date(t0 + 30 * 60_000).toISOString());
    picked = [...new Set((prev ?? []).map((r) => r.company_id as string))].filter((id) => best.has(id));
  } else {
    while (picked.length < n && [...byCat.values()].some((l) => l.length)) {
      for (const l of byCat.values()) if (l.length && picked.length < n) picked.push(l.shift()!);
    }
  }

  let stories = 0, errors = 0;
  for (let i = 0; i < picked.length; i += 5) {
    await Promise.all(
      picked.slice(i, i + 5).map(async (id) => {
        const j = best.get(id)!;
        const base = { company_id: id, company: j.company_name, old_category: cat.get(id) ?? null, job_title: j.title_raw };
        try {
          const r = await extractProduct(j.company_name, j.postings);
          if (r.story) stories++;
          await db.from("product_samples").insert({ ...base, story: r.story, short: r.short, quote: r.quote, category: r.category, raw: { pass: arg === "same" ? 2 : 1, ...(r.raw as object) } });
        } catch (e) {
          errors++;
          await db.from("product_samples").insert({ ...base, error: (e as Error).message });
        }
      }),
    );
  }
  notice(`Product sample (${arg}): ${picked.length} companies, plain-English story for ${stories}, ${errors} errors. Every story has a quote verified against the posting.`);
}

main().catch(fail);
