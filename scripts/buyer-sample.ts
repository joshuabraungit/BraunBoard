// Read-only test of "who you're selling to" extraction on a random sample of rep jobs.
// Nothing on the site changes: results go to the buyer_samples scratch table for review.
// Usage: npx tsx scripts/buyer-sample.ts 50

import { adminClient } from "../src/lib/supabase/admin";
import { fail, notice, requireEnv } from "./report";

const SYSTEM = `You read B2B sales job postings for a job board used by salespeople.
Answer one question: who does this rep sell to?

Return ONLY a JSON object:
{
  "buyer": the job titles or departments the rep sells to, as the posting states them, in plain words (e.g. "CFOs and finance teams", "CISOs and security leaders", "HR and People leaders", "Developers and engineering leaders", "Restaurant owners"). Null if the posting doesn't say.
  "buyer_quote": the exact words from the posting that support "buyer", copied character for character (max 200 chars). Null if buyer is null.
  "industry": the industry or market the customers are in, if stated (e.g. "Healthcare", "Federal government", "Professional sports and media", "Restaurants"). Null if not stated.
  "industry_quote": exact supporting words from the posting, copied character for character (max 200 chars). Null if industry is null.
}

Hard rules:
- Use ONLY what the posting says. Never guess the buyer from what you know about the company or product.
- Generic phrases like "key decision makers", "C-level executives", "stakeholders" or "customers" are NOT a buyer. Return null for those.
- Words about the company's own team (who the rep works with internally) are not the buyer.
- Company size alone (enterprise, mid-market, SMB) is not a buyer or an industry.`;

const norm = (s: string) => s.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();

async function ask(key: string, title: string, description: string) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.EXTRACTION_MODEL ?? "claude-haiku-5-5",
      max_tokens: 1500,
      system: SYSTEM,
      messages: [{ role: "user", content: `Title: ${title}\n\nPosting:\n${description.slice(0, 12_000)}` }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { content: { type: string; text?: string }[] };
  const text = data.content.filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error(`No JSON: ${text.slice(0, 120)}`);
  return JSON.parse(text.slice(start, end + 1)) as { buyer: string | null; buyer_quote: string | null; industry: string | null; industry_quote: string | null };
}

async function main() {
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY");
  const n = Number(process.argv[2] ?? 50);
  const db = adminClient();
  const { data: pool, error } = await db
    .from("visible_jobs")
    .select("id, company_name, title_raw, sales_segment, description_raw")
    .in("role_family", ["SDR/BDR", "Account Executive", "Account Manager", "Customer Expansion"])
    .eq("seniority", "Individual Contributor")
    .not("description_raw", "is", null)
    .limit(2000);
  if (error) throw error;
  // Random sample, at most 2 jobs per company so one big employer doesn't dominate.
  const shuffled = [...(pool ?? [])].sort(() => Math.random() - 0.5);
  const perCo = new Map<string, number>();
  const sample = shuffled.filter((j) => {
    const k = (perCo.get(j.company_name) ?? 0) + 1;
    perCo.set(j.company_name, k);
    return k <= 2;
  }).slice(0, n);

  const key = process.env.ANTHROPIC_API_KEY!;
  let buyers = 0, industries = 0, bad = 0;
  for (let i = 0; i < sample.length; i += 5) {
    await Promise.all(
      sample.slice(i, i + 5).map(async (j) => {
        try {
          const r = await ask(key, j.title_raw, j.description_raw!);
          const text = norm(j.description_raw!);
          const bFound = r.buyer_quote ? text.includes(norm(r.buyer_quote)) : null;
          const iFound = r.industry_quote ? text.includes(norm(r.industry_quote)) : null;
          if (r.buyer && bFound) buyers++;
          if (r.industry && iFound) industries++;
          if (bFound === false || iFound === false) bad++;
          await db.from("buyer_samples").insert({
            job_id: j.id, company: j.company_name, title: j.title_raw, segment: j.sales_segment,
            buyer: r.buyer, buyer_quote: r.buyer_quote, buyer_quote_found: bFound,
            industry: r.industry, industry_quote: r.industry_quote, industry_quote_found: iFound, raw: r,
          });
        } catch (e) {
          await db.from("buyer_samples").insert({ job_id: j.id, company: j.company_name, title: j.title_raw, error: (e as Error).message });
        }
      }),
    );
  }
  notice(`Buyer sample: ${sample.length} jobs, buyer found with a verified quote in ${buyers}, industry in ${industries}, ${bad} quotes not found in the posting`);
}

main().catch(fail);
