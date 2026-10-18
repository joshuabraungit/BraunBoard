// Read-only test of "What they sell, in plain English". Nothing on the site changes:
// results go to the product_samples scratch table for review.
// Usage: npx tsx scripts/product-sample.ts 50

import { adminClient } from "../src/lib/supabase/admin";
import { extractProduct } from "../src/lib/ingest/product";
import { fail, notice, requireEnv } from "./report";

async function main() {
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY");
  const n = Number(process.argv[2] ?? 50);
  const db = adminClient();
  const { data: jobs, error } = await db
    .from("visible_jobs")
    .select("company_id, company_name, title_raw, description_raw")
    .not("description_raw", "is", null)
    .limit(5000);
  if (error) throw error;

  // One posting per company: the longest one, since it's most likely to describe the product.
  const best = new Map<string, { company_id: string; company_name: string; title_raw: string; description_raw: string }>();
  for (const j of jobs ?? []) {
    const cur = best.get(j.company_id);
    if (!cur || (j.description_raw as string).length > cur.description_raw.length) best.set(j.company_id, j as never);
  }
  const { data: cos } = await db.from("companies").select("id, industry").in("id", [...best.keys()]);
  const cat = new Map((cos ?? []).map((c) => [c.id as string, c.industry as string | null]));

  // Spread the sample across the old categories so we see every kind of product.
  const byCat = new Map<string, string[]>();
  for (const id of [...best.keys()].sort(() => Math.random() - 0.5)) {
    const k = cat.get(id) ?? "none";
    byCat.set(k, [...(byCat.get(k) ?? []), id]);
  }
  const picked: string[] = [];
  while (picked.length < n && [...byCat.values()].some((l) => l.length)) {
    for (const l of byCat.values()) if (l.length && picked.length < n) picked.push(l.shift()!);
  }

  let stories = 0, errors = 0;
  for (let i = 0; i < picked.length; i += 5) {
    await Promise.all(
      picked.slice(i, i + 5).map(async (id) => {
        const j = best.get(id)!;
        const base = { company_id: id, company: j.company_name, old_category: cat.get(id) ?? null, job_title: j.title_raw };
        try {
          const r = await extractProduct(j.company_name, j.description_raw);
          if (r.story) stories++;
          await db.from("product_samples").insert({ ...base, story: r.story, short: r.short, quote: r.quote, category: r.category, raw: r.raw });
        } catch (e) {
          errors++;
          await db.from("product_samples").insert({ ...base, error: (e as Error).message });
        }
      }),
    );
  }
  notice(`Product sample: ${picked.length} companies, plain-English story for ${stories}, ${errors} errors. Every story has a quote verified against the posting.`);
}

main().catch(fail);
