// One-off market check: how many UK sales jobs do the companies we already track have?
// Read-only. Fetches every enabled board, saves nothing, prints a summary.
// Usage: npx tsx scripts/uk-count.ts

import { appendFileSync } from "node:fs";
import { adminClient } from "../src/lib/supabase/admin";
import { adapters } from "../src/lib/ingest/adapters";
import { classifyTitle } from "../src/lib/ingest/classify";
import { locate } from "../src/lib/ingest/pipeline";
import { ENABLED_PROVIDERS } from "../src/lib/ingest/providers";
import type { CompanyRef, RawJob } from "../src/lib/ingest/types";
import { fail, notice, requireEnv } from "./report";

const UK = /\b(united kingdom|u\.?k\.?|great britain|england|scotland|wales|northern ireland|london|manchester|edinburgh|glasgow|bristol|leeds|belfast|cardiff|newcastle|liverpool|nottingham|sheffield|brighton)\b/i;
const EUROPE_WIDE = /\b(emea|europe|european|uk\s*&\s*i|uki)\b/i;
// UK titles our US classifier may not know yet.
const UK_TITLES = /\b(new business (manager|executive|director)|business development (manager|executive|director)|account director|field sales|sales executive|key account manager|partner manager)\b/i;

const hint = (j: RawJob) => [j.location, j.country_hint, j.region_hint, j.city_hint].filter(Boolean).join(" | ");

async function main() {
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");
  const db = adminClient();
  const { data: companies, error } = await db
    .from("companies")
    .select("id, name, ats_provider, ats_identifier")
    .eq("is_disabled", false)
    .in("ats_provider", ENABLED_PROVIDERS);
  if (error) throw error;

  const byCompany = new Map<string, number>();
  const byRole = new Map<string, number>();
  let uk = 0, ukWithPay = 0, ukOte = 0, ukRemote = 0, europeWide = 0, ukMissedTitles = 0, failed = 0, crawled = 0;
  const missedExamples: string[] = [];
  const samples: string[] = [];

  const queue = [...((companies ?? []) as CompanyRef[])];
  const worker = async () => {
    for (let c = queue.shift(); c; c = queue.shift()) {
      let jobs: RawJob[];
      try {
        jobs = await adapters[c.ats_provider].fetchJobs(c);
        crawled++;
      } catch {
        failed++;
        continue;
      }
      for (const j of jobs) {
        const where = hint(j);
        const loc = locate(j);
        if (loc.markets.length) continue; // already a US/Canada job
        const isUk = UK.test(where) || /^(GB|GBR|UK)$/i.test(j.country_hint ?? "");
        const cls = classifyTitle(j.title);
        if (!isUk) {
          if (cls && EUROPE_WIDE.test(where)) europeWide++;
          continue;
        }
        if (!cls) {
          if (UK_TITLES.test(j.title)) {
            ukMissedTitles++;
            if (missedExamples.length < 15) missedExamples.push(`${c.name}: ${j.title}`);
          }
          continue;
        }
        uk++;
        byCompany.set(c.name, (byCompany.get(c.name) ?? 0) + 1);
        byRole.set(cls.role_family, (byRole.get(cls.role_family) ?? 0) + 1);
        if (/remote/i.test(where)) ukRemote++;
        const pay = j.salary_min != null || /£\s?\d/.test(j.description) || /\bGBP\s?\d/i.test(j.description);
        if (pay) ukWithPay++;
        if (/\b(OTE|on[- ]target earnings)\b/i.test(j.description)) ukOte++;
        if (samples.length < 15) samples.push(`${c.name}: ${j.title} (${j.location})`);
      }
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));

  const top = [...byCompany.entries()].sort((a, b) => b[1] - a[1]);
  const roles = [...byRole.entries()].sort((a, b) => b[1] - a[1]);
  const pct = (n: number) => (uk ? Math.round((n / uk) * 100) : 0);
  const lines = [
    `# UK sales jobs at companies we already track`,
    ``,
    `- Companies checked: ${crawled} (${failed} boards failed to load)`,
    `- **UK sales jobs: ${uk}** at ${byCompany.size} companies`,
    `- Mention a pay number (£): ${ukWithPay} (${pct(ukWithPay)}%)`,
    `- Mention OTE: ${ukOte} (${pct(ukOte)}%)`,
    `- Remote in the UK: ${ukRemote}`,
    `- Extra UK jobs with UK-style titles we'd need to teach (e.g. New Business Manager): ${ukMissedTitles}`,
    `- Sales jobs posted as EMEA / Europe-wide (not counted above): ${europeWide}`,
    ``,
    `## By role`,
    ...roles.map(([r, n]) => `- ${r}: ${n}`),
    ``,
    `## Top companies`,
    ...top.slice(0, 25).map(([n, k]) => `- ${n}: ${k}`),
    ``,
    `## Sample UK jobs`,
    ...samples.map((s) => `- ${s}`),
    ``,
    `## Sample UK-style titles we'd miss today`,
    ...missedExamples.map((s) => `- ${s}`),
  ];
  console.log(lines.join("\n"));
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n") + "\n");
  notice(`UK: ${uk} sales jobs at ${byCompany.size} companies; ${pct(ukWithPay)}% mention pay; ${ukMissedTitles} more with UK-style titles; ${europeWide} EMEA-wide`);
}

main().catch(fail);
