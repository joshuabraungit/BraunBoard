// One-off: print a few full German sales postings so we can see what they look like. Read-only.
import { adminClient } from "../src/lib/supabase/admin";
import { adapters } from "../src/lib/ingest/adapters";
import { classifyTitle } from "../src/lib/ingest/classify";
import { locate } from "../src/lib/ingest/pipeline";
import { ENABLED_PROVIDERS } from "../src/lib/ingest/providers";
import { htmlToText } from "../src/lib/ingest/html";
import type { CompanyRef, RawJob } from "../src/lib/ingest/types";
import { fail } from "./report";

const DE = /\b(germany|deutschland|berlin|munich|m[üu]nchen|hamburg|frankfurt|cologne|k[öo]ln|d[üu]sseldorf|stuttgart|DACH)\b/i;
const PAY = /\bEUR\s?\d|\d[\d .,]*\s?(EUR|€)|€\s?\d/i;

async function main() {
  const db = adminClient();
  const { data } = await db.from("companies").select("id, name, ats_provider, ats_identifier").eq("is_disabled", false).in("ats_provider", ENABLED_PROVIDERS);
  const picks: { c: string; j: RawJob; pay: boolean }[] = [];
  for (const c of (data ?? []) as CompanyRef[]) {
    if (picks.filter((p) => p.pay).length >= 2 && picks.filter((p) => !p.pay).length >= 1) break;
    try {
      for (const j of await adapters[c.ats_provider].fetchJobs(c)) {
        const where = [j.location, j.country_hint, j.city_hint].filter(Boolean).join(" ");
        if (locate(j).markets.length || !DE.test(where) || !classifyTitle(j.title)) continue;
        const pay = PAY.test(j.description);
        if (pay ? picks.filter((p) => p.pay).length < 2 : picks.filter((p) => !p.pay).length < 1) picks.push({ c: c.name, j, pay });
        break;
      }
    } catch { /* skip */ }
  }
  for (const { c, j, pay } of picks) {
    console.log(`\n=====JOB===== ${c} | ${j.title} | ${j.location} | pay:${pay} | ${j.apply_url ?? j.source_url}`);
    console.log(htmlToText(j.description).slice(0, 6000));
  }
}
main().catch(fail);
