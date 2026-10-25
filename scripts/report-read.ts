// Job Market Report: read every live rep posting (SDR, AE, AM; individual contributors) once.
// Also records pay the job system shows outside the text (Ashby's salary and commission fields).
// Usage: npx tsx scripts/report-read.ts <report id> [max jobs] [--sample]
import { adminClient } from "../src/lib/supabase/admin";
import { readPosting } from "../src/lib/report-read";
import { fail, notice, requireEnv } from "./report";

type Job = { id: string; title_raw: string; company_name: string; company_id: string; description_raw: string; source_provider: string; source_job_id: string };

async function ashbyPay(org: string): Promise<Map<string, { salary: boolean; commission: boolean }>> {
  const out = new Map<string, { salary: boolean; commission: boolean }>();
  try {
    const r = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(org)}?includeCompensation=true`);
    if (!r.ok) return out;
    const d = (await r.json()) as { jobs: { id: string; compensation?: { summaryComponents?: { compensationType: string; minValue: number | null }[] } }[] };
    for (const j of d.jobs ?? []) {
      const parts = j.compensation?.summaryComponents ?? [];
      out.set(j.id, {
        salary: parts.some((p) => p.compensationType === "Salary" && p.minValue != null),
        commission: parts.some((p) => ["Commission", "Bonus"].includes(p.compensationType) && p.minValue != null),
      });
    }
  } catch {
    /* board pay is optional */
  }
  return out;
}

async function main() {
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY");
  const report = process.argv[2];
  if (!report) throw new Error("Pass a report id, e.g. 2026-10");
  const max = Number(process.argv[3] ?? 5000);
  const sample = process.argv.includes("--sample");
  const db = adminClient();

  const jobs: Job[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("visible_jobs")
      .select("id, title_raw, company_name, company_id, description_raw, source_provider, source_job_id")
      .in("role_family", ["SDR/BDR", "Account Executive", "Account Manager"])
      .eq("seniority", "Individual Contributor")
      .not("description_raw", "is", null)
      .order("id")
      .range(from, from + 999);
    if (error) throw error;
    jobs.push(...((data ?? []) as Job[]));
    if ((data ?? []).length < 1000) break;
  }
  const { data: done } = await db.from("report_reads").select("job_id").eq("report", report).limit(10000);
  const seen = new Set((done ?? []).map((r) => r.job_id as string));
  let todo = jobs.filter((j) => !seen.has(j.id));
  if (sample) todo = todo.sort(() => Math.random() - 0.5);
  todo = todo.slice(0, max);
  notice(`Report ${report}: ${jobs.length} rep postings, ${seen.size} already read, reading ${todo.length}`);

  // Ashby keeps salary and commission in its own fields, not in the text.
  const ashbyCos = [...new Set(todo.filter((j) => j.source_provider === "ashby").map((j) => j.company_id))];
  const orgs = new Map<string, string>();
  for (let i = 0; i < ashbyCos.length; i += 200) {
    const { data } = await db.from("companies").select("id, ats_identifier").in("id", ashbyCos.slice(i, i + 200));
    for (const c of data ?? []) orgs.set(c.id as string, c.ats_identifier as string);
  }
  const boards = new Map<string, Map<string, { salary: boolean; commission: boolean }>>();
  for (const [id, org] of orgs) boards.set(id, await ashbyPay(org));

  let tin = 0, tout = 0, errors = 0, n = 0;
  for (let i = 0; i < todo.length; i += 8) {
    await Promise.all(
      todo.slice(i, i + 8).map(async (j) => {
        try {
          const r = await readPosting(j.title_raw, j.company_name, j.description_raw);
          tin += r.tokensIn; tout += r.tokensOut; n++;
          const board_pay = j.source_provider === "ashby" ? boards.get(j.company_id)?.get(j.source_job_id) ?? null : null;
          const { error } = await db.from("report_reads").upsert({ job_id: j.id, report, read: r.read, board_pay, tokens_in: r.tokensIn, tokens_out: r.tokensOut });
          if (error) throw error;
        } catch (e) {
          errors++;
          if (errors <= 5) notice(`Error on ${j.company_name} · ${j.title_raw}: ${(e as Error).message.slice(0, 200)}`);
        }
      }),
    );
  }
  notice(`Read ${n} postings, ${errors} errors. Tokens: ${tin} in, ${tout} out (avg ${Math.round(tin / Math.max(n, 1))} in, ${Math.round(tout / Math.max(n, 1))} out).`);
}

main().catch(fail);
