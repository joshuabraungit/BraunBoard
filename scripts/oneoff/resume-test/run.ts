// Test harness: reads the fictional résumés in this folder with the real résumé reader,
// builds a watch from them, and ranks live jobs. Writes results.md. Reads only, writes nothing to the DB.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { readResume } from "../../../src/lib/resume-read";
import { answersToPrefs, OnboardingAnswers } from "../../../src/lib/watch-prefs";
import { rankForWatch } from "../../../src/lib/matching";
import { INDUSTRIES, jobIndustries } from "../../../src/lib/industries";
import type { JobView } from "../../../src/lib/data";

const dir = "scripts/oneoff/resume-test";
const COLS =
  "id, slug, title_raw, role_family, seniority, sales_segment, sales_motion, self_sourcing_level, customer_segment, remote_type, location_raw, city, state, salary_min, salary_max, ote_min, ote_max, apply_url, first_seen_at:posted_at, company_id, company_name, company_slug, flags, currency, markets, company_size, buyer, industry, company_sells, company_sector";

async function main() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const jobs: JobView[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("visible_jobs").select(COLS).order("posted_at", { ascending: false }).range(from, from + 999);
    if (error) throw error;
    jobs.push(...((data ?? []) as unknown as JobView[]));
    if (!data || data.length < 1000) break;
  }

  const out: string[] = [`# Résumé test (${new Date().toISOString().slice(0, 16)}Z), ${jobs.length} live jobs\n`];
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".pdf")).sort()) {
    out.push(`## ${f}`);
    try {
      const p = await readResume({ pdf: readFileSync(join(dir, f)) });
      out.push("**Read:** `" + JSON.stringify(p.answers) + "`", "", "**Saw:** `" + JSON.stringify(p.saw) + "`", "");
      if (!p.answers.roles?.length) {
        out.push("No roles read, skipping matches.\n");
        continue;
      }
      // Pay and dealbreakers stay blank, like a fresh upload.
      const a = OnboardingAnswers.parse({ min_base: null, min_ote: null, work: "any", motion: "either", ...p.answers, sold_to: [p.saw.sold_to, p.saw.industries].filter(Boolean).join("; ").slice(0, 160) });
      const prefs = answersToPrefs(a);
      const withInd = rankForWatch(jobs, prefs);
      const noInd = rankForWatch(jobs, { ...prefs, industries: [] });
      out.push(`**Matches:** ${withInd.jobs.length} with industry filter (${noInd.jobs.length} without)`, "");
      for (const j of withInd.jobs.slice(0, 10)) {
        const inds = jobIndustries(j as never).map((k) => INDUSTRIES[k].label).join(", ");
        out.push(`- ${withInd.matches.get(j.id)!.score} · ${j.title_raw} @ ${j.company_name} · ${j.location_raw ?? ""} · sector=${(j as { company_sector?: string }).company_sector ?? "?"} · sells to: ${j.industry ?? j.buyer ?? "?"} → [${inds}]`);
      }
      out.push("");
    } catch (e) {
      out.push(`ERROR: ${e instanceof Error ? e.message : e}\n`);
    }
  }
  writeFileSync(join(dir, "results.md"), out.join("\n"));
  console.log(out.join("\n"));
}
main();
