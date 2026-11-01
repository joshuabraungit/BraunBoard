// Read-only dry run: what Germany would look like on the board. Saves nothing.
import { adminClient } from "../src/lib/supabase/admin";
import { adapters } from "../src/lib/ingest/adapters";
import { fetchGreenhousePayRange } from "../src/lib/ingest/adapters/greenhouse";
import { classifyTitle, isTalentPool, stripGenderTag, writtenInGerman } from "../src/lib/ingest/classify";
import { locate } from "../src/lib/ingest/pipeline";
import { titleOutOfMarket } from "../src/lib/ingest/location";
import { resolveCompensation } from "../src/lib/ingest/compensation";
import { ENABLED_PROVIDERS } from "../src/lib/ingest/providers";
import { computeFlags } from "../src/lib/flags";
import { formatComp, formatLocation } from "../src/lib/format";
import type { CompanyRef } from "../src/lib/ingest/types";
import { fail } from "./report";

async function main() {
  const db = adminClient();
  const { data } = await db.from("companies").select("id, name, ats_provider, ats_identifier").eq("is_disabled", false).in("ats_provider", ENABLED_PROVIDERS);
  let kept = 0, german = 0, pool = 0, pay = 0, ote = 0, gerReq = 0, stripped = 0, alsoOther = 0;
  const cards: string[] = [];
  const payLines: string[] = [];
  const queue = [...((data ?? []) as CompanyRef[])];
  const worker = async () => {
    for (let c = queue.shift(); c; c = queue.shift()) {
      let jobs;
      try { jobs = await adapters[c.ats_provider].fetchJobs(c); } catch { continue; }
      for (const raw of jobs) {
        const job = { ...raw, title: stripGenderTag(raw.title) };
        const cls = classifyTitle(job.title);
        if (!cls) continue;
        const loc = locate(job);
        if (!loc.markets.includes("DE") || titleOutOfMarket(job.title, loc.markets)) continue;
        if (loc.markets.length > 1) { alsoOther++; continue; }
        if (isTalentPool(job.description)) { pool++; continue; }
        if (writtenInGerman(job.description)) { german++; continue; }
        kept++;
        if (job.title !== raw.title) stripped++;
        let structured = { min: job.salary_min, max: job.salary_max, currency: job.currency, isOte: !!job.structured_is_ote };
        if (job.source_provider === "greenhouse") {
          try { const p = await fetchGreenhousePayRange(c.ats_identifier, job.source_job_id, "DE"); if (p) structured = p; } catch { /* optional */ }
        }
        if (structured.currency && structured.currency !== "EUR") structured = { ...structured, min: null, max: null, currency: null };
        if (!structured.currency && !/€|\bEUR\b/.test(job.description)) structured = { ...structured, min: null, max: null };
        const comp = resolveCompensation(structured, job.description, "€");
        const hasPay = comp.salary_min != null || comp.ote_min != null;
        if (hasPay) pay++;
        if (comp.ote_min != null) ote++;
        const flags = computeFlags({ description_raw: job.description.toLowerCase(), ...comp, self_sourcing_level: "Unknown", disclosures: {}, role_family: cls.role_family });
        if (flags.some((f) => f.code === "german_required")) gerReq++;
        const where = formatLocation({ remote_type: loc.remote_type, city: loc.city, state: loc.state, location_raw: job.location, markets: loc.markets });
        const line = `${c.name} | ${job.title} | ${where} | ${formatComp({ ...comp, currency: hasPay ? "EUR" : null }) || "no pay"} | ${flags.map((f) => f.label).join(", ")}`;
        if (hasPay) payLines.push(line);
        if (cards.length < 25) cards.push(line);
      }
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  const pct = (n: number) => `${kept ? Math.round((n / kept) * 100) : 0}%`;
  console.log(`DRYRUN kept=${kept} germanLanguage=${german} talentPool=${pool} alsoOtherCountry=${alsoOther} pay=${pay} (${pct(pay)}) ote=${ote} (${pct(ote)}) germanRequired=${gerReq} (${pct(gerReq)}) genderTagStripped=${stripped}`);
  console.log("CARDS");
  for (const l of cards) console.log("- " + l);
  console.log("PAY");
  for (const l of payLines) console.log("- " + l);
}
main().catch(fail);
