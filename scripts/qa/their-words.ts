// Test "Say it in their words" against real Braun Board jobs with made-up résumés.
// Read-only for the site: results go to the words_qa scratch table for review.
// Run with: npx tsx --conditions=react-server scripts/qa/their-words.ts
import { adminClient } from "../../src/lib/supabase/admin";
import { jobContext, type ToolJob } from "../../src/lib/job-tools/context";
import { cleanTune, lineFromAnswer, tuneRaw } from "../../src/lib/job-tools/tune";
import { readFit } from "../../src/lib/job-tools/fit";
import { buildCopy } from "../../src/lib/job-tools/words-text";
import { fail, notice, requireEnv } from "../report";
import { RESUMES, type TestResume } from "./resumes";

const PER_RESUME = 2;

const FILTERS: Record<TestResume["role"], { family: string[]; title?: string }> = {
  "SDR/BDR": { family: ["SDR/BDR"] },
  "Account Executive": { family: ["Account Executive"] },
  "Account Manager": { family: ["Account Manager", "Customer Expansion"] },
  Partnerships: { family: ["Account Executive", "Account Manager", "Sales Manager", "Sales Director"], title: "%artner%" },
  "Sales Leadership": { family: ["Sales Manager"], title: "%evelopment%" },
};

async function main() {
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY");
  const db = adminClient();
  const batch = new Date().toISOString().slice(0, 16);
  const used = new Set<string>();
  let done = 0;

  for (const r of RESUMES) {
    const f = FILTERS[r.role];
    let q = db
      .from("visible_jobs")
      .select("slug, title_raw, company_id, company_name, company_domain, description_raw, buyer, summary, role_family, seniority, sales_motion, self_sourcing_level, role_plain")
      .in("role_family", f.family)
      .not("description_raw", "is", null)
      .order("first_seen_at", { ascending: false })
      .limit(60);
    if (f.title) q = q.ilike("title_raw", f.title);
    const { data, error } = await q;
    if (error) throw error;
    const jobs = ((data ?? []) as ToolJob[]).filter((j) => (j.description_raw ?? "").length > 2000 && !used.has(j.company_id));
    // Spread across companies: every 7th, so it isn't just this week's top poster.
    const picks = jobs.filter((_, i) => i % 7 === RESUMES.indexOf(r) % 7).slice(0, PER_RESUME);
    while (picks.length < PER_RESUME && jobs.length > picks.length) picks.push(jobs.find((j) => !picks.includes(j))!);

    for (const job of picks) {
      used.add(job.company_id);
      const row: Record<string, unknown> = { batch, resume_name: r.name, job_slug: job.slug, company: job.company_name, job_title: job.title_raw };
      try {
        const text = jobContext(job, null);
        if (process.env.QA_MODE === "fit") {
          row.cleaned = await readFit(r.text, text, r.facts ?? []);
          const { error: e3 } = await db.from("words_qa").insert(row);
          if (e3) throw e3;
          done++;
          notice(`${r.name} x ${job.company_name}: fit ok`);
          continue;
        }
        const raw = await tuneRaw(r.text, text, r.facts ?? []);
        const cleaned = cleanTune(raw, r.text, r.facts ?? []);
        row.raw = raw;
        row.cleaned = cleaned;
        if (cleaned.gaps[0]) row.gap_line = { want: cleaned.gaps[0].want, ask: cleaned.gaps[0].ask, said: r.answer, line: await lineFromAnswer(r.text, text, cleaned.gaps[0].want, r.answer) };
        // The copy if they took every suggestion.
        const line = (row.gap_line as { line?: { text: string; after: string } } | undefined)?.line;
        row.copy = buildCopy(r.text, cleaned.edits, [...cleaned.adds, ...(line ? [line] : [])]);
      } catch (e) {
        row.error = e instanceof Error ? e.message : String(e);
      }
      const { error: e2 } = await db.from("words_qa").insert(row);
      if (e2) throw e2;
      done++;
      notice(`${r.name} x ${job.company_name}: ${row.error ? `ERROR ${row.error}` : "ok"}`);
    }
  }
  notice(`Done: ${done} runs in batch ${batch}`);
}

main().catch(fail);
