// One-off market check: how many German sales jobs do tracked companies have?
// Read-only. Fetches every enabled board, saves nothing, prints a summary.
// Usage: npx tsx scripts/germany-count.ts

import { appendFileSync } from "node:fs";
import { adminClient } from "../src/lib/supabase/admin";
import { adapters } from "../src/lib/ingest/adapters";
import { classifyTitle } from "../src/lib/ingest/classify";
import { locate } from "../src/lib/ingest/pipeline";
import { ENABLED_PROVIDERS } from "../src/lib/ingest/providers";
import type { CompanyRef, RawJob } from "../src/lib/ingest/types";
import { fail, notice, requireEnv } from "./report";

const UK = /\b(germany|deutschland|german|berlin|munich|m[üu]nchen|hamburg|frankfurt|cologne|k[öo]ln|d[üu]sseldorf|stuttgart|leipzig|hannover|hanover|nuremberg|n[üu]rnberg|dortmund|essen|bremen|dresden|karlsruhe|mannheim|bonn|DE|DEU|DACH)\b/;
const EUROPE_WIDE = /\b(emea|europe|european)\b/i;
// UK titles our US classifier may not know yet.
const UK_TITLES = /(vertrieb|au[ßs]endienst|key account|sales|account (manager|executive|director)|business development|new business)/i;
// German-language posting: lots of common German words.
const GERMAN_TEXT = (t: string) => (t.match(/\b(und|wir|sie|der|die|das|f[üu]r|mit|unsere?n?|bei|ist)\b/gi) ?? []).length > 40;

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
  let german = 0, uk = 0, ukWithPay = 0, ukOte = 0, ukRemote = 0, europeWide = 0, ukMissedTitles = 0, failed = 0, crawled = 0;
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
        const isUk = UK.test(where) || new RegExp(UK.source.replace("|DE|DEU|DACH", ""), "i").test(where) || /^(DE|DEU|germany|deutschland)$/i.test(j.country_hint ?? "");
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
        if (GERMAN_TEXT(j.description)) german++;
        const pay = j.salary_min != null || /\bEUR\s?\d|\d[\d .,]*\s?(EUR|€)|€\s?\d/i.test(j.description);
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
    `# German sales jobs at companies we already track`,
    ``,
    `- Companies checked: ${crawled} (${failed} boards failed to load)`,
    `- **Germany sales jobs: ${uk}** at ${byCompany.size} companies`,
    `- Mention a pay number (EUR or structured): ${ukWithPay} (${pct(ukWithPay)}%)`,
    `- Mention OTE: ${ukOte} (${pct(ukOte)}%)`,
    `- Remote in Germany: ${ukRemote}`,
    `- Posting written in German: ${german} (${pct(german)}%)`,
    `- Extra jobs with titles our classifier doesn't know yet: ${ukMissedTitles}`,
    `- Sales jobs posted as EMEA / Europe-wide (not counted above): ${europeWide}`,
    ``,
    `## By role`,
    ...roles.map(([r, n]) => `- ${r}: ${n}`),
    ``,
    `## Top companies`,
    ...top.slice(0, 25).map(([n, k]) => `- ${n}: ${k}`),
    ``,
    `## Sample jobs`,
    ...samples.map((s) => `- ${s}`),
    ``,
    `## Sample titles we'd miss today`,
    ...missedExamples.map((s) => `- ${s}`),
  ];
  console.log(lines.join("\n"));
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n") + "\n");
  notice(`Germany roles: ${roles.map(([r, n]) => `${r} ${n}`).join(", ")}`);
  notice(`Germany top companies: ${top.slice(0, 20).map(([n, k]) => `${n} ${k}`).join(", ")}`);
  notice(`Germany OTE mentioned: ${ukOte} (${pct(ukOte)}%); remote: ${ukRemote}`);
  notice(`Germany samples: ${samples.slice(0, 8).join("; ")}`);
  notice(`Germany: ${uk} sales jobs at ${byCompany.size} companies; ${pct(german)}% in German; ${pct(ukWithPay)}% mention pay; ${ukMissedTitles} more with sales-ish titles; ${europeWide} EMEA-wide`);
}

main().catch(fail);
