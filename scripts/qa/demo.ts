// One real end-to-end run of Before You Apply, for a walkthrough. Made-up résumé, real job.
// Step "fit": the fit read. Step "rest": answers (from demo-answers.json) -> résumé copy -> prep.
// Results go to words_qa (batch "demo-..."). The site is untouched.
import { readFileSync } from "node:fs";
import { adminClient } from "../../src/lib/supabase/admin";
import { jobContext, type ToolJob } from "../../src/lib/job-tools/context";
import { readFit } from "../../src/lib/job-tools/fit";
import { cleanTune, tuneRaw } from "../../src/lib/job-tools/tune";
import { buildCopy } from "../../src/lib/job-tools/words-text";
import { buildPrep, type GapNote } from "../../src/lib/job-tools/prep";
import { braunRead } from "../../src/lib/flags";
import { questionsFor } from "../../src/lib/questions";
import { fail, notice, requireEnv } from "../report";
import { RESUMES } from "./resumes";

const SLUG = "thatch-account-executive-mid-market-central-78682008";

async function main() {
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY");
  const db = adminClient();
  const { data: job, error } = await db.from("visible_jobs").select("*").eq("slug", SLUG).single();
  if (error) throw error;
  const r = RESUMES.find((x) => x.name === "ae-midmarket")!;
  const text = jobContext(job as ToolJob, null);
  const step = process.env.DEMO_STEP ?? "fit";
  const row: Record<string, unknown> = { batch: `demo-${step}`, resume_name: r.name, job_slug: SLUG, company: job.company_name, job_title: job.title_raw };
  if (step === "fit") {
    row.cleaned = await readFit(r.text, text, []);
  } else {
    const answers = JSON.parse(readFileSync("scripts/qa/demo-answers.json", "utf8")) as GapNote[];
    const facts = answers.filter((a) => a.has && a.said).map((a) => `${a.want}: ${a.said}`);
    const tune = cleanTune(await tuneRaw(r.text, text, facts), r.text, facts);
    const copy = buildCopy(r.text, tune.edits, tune.adds);
    const read = braunRead({ ...job, company: null });
    const lights = [
      ...read.flags.filter((f) => f.tone === "red").map((f) => `${f.label}. ${f.why}`),
      ...read.checks.filter((c) => c.grade === "bad" || c.grade === "unknown").map((c) => c.detail),
    ].slice(0, 5);
    const asks = questionsFor({ ...job, flags: read.flags, company: null }, 4).map((q) => ({ text: q.text, why: q.why }));
    const prep = await buildPrep({ jobText: text, resume: r.text, stage: "hiring_manager", bio: "", stories: "", lights, existingQuestions: asks.map((a) => a.text), gaps: answers, facts: [] });
    row.cleaned = { tune, copy, prep: { ...prep, lights, asks }, verdict: read.verdict, line: read.line };
  }
  const { error: e2 } = await db.from("words_qa").insert(row);
  if (e2) throw e2;
  notice(`demo ${step} done`);
}
main().catch(fail);
