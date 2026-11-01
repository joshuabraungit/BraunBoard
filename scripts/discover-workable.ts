// Company discovery from Workable's public XML job feed: every company hiring salespeople in the
// US, Canada or the UK on Workable goes to the approval queue (Admin > Discover).
// Usage: npx tsx scripts/discover-workable.ts [--dry-run]

import { adminClient } from "../src/lib/supabase/admin";
import { streamWorkableFeed, toRawJob, type WorkableFeedJob } from "../src/lib/ingest/adapters/workable";
import { candidateNote, inScopeSalesJob, normalizeDomain, saveCandidates, type FoundCompany } from "../src/lib/ingest/discover";
import { classifyTitle } from "../src/lib/ingest/classify";
import { notice, requireEnv } from "./report";

const RECENT_DAYS = 90;

async function main() {
  const dry = process.argv.includes("--dry-run");
  if (!dry) requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");

  const started = Date.now();
  const by = new Map<string, { job: WorkableFeedJob; markets: string[] }[]>();
  let sales = 0;
  const { total, bytes } = await streamWorkableFeed((j) => {
    // Cheap title check first; the location and talent-pool checks need the full job.
    if (!j.account || !classifyTitle(j.title)) return false;
    const raw = toRawJob(j, j.company);
    // The feed keeps postings up for years. Only recent ones say a company is hiring now.
    if (!raw.posted_at || Date.now() - new Date(raw.posted_at).getTime() > RECENT_DAYS * 86_400_000) return false;
    const ok = inScopeSalesJob(raw);
    if (!ok) return false;
    sales++;
    by.set(j.account, [...(by.get(j.account) ?? []), { job: { ...j, description: raw.description }, markets: ok.markets }]);
    return false; // collected above, don't keep a second copy
  });

  const found: FoundCompany[] = [...by.entries()].map(([account, jobs]) => ({
    name: jobs[0]!.job.company || account,
    domain: normalizeDomain(jobs.find((j) => j.job.website)?.job.website),
    provider: "workable",
    identifier: account,
    source: "workable-feed",
    jobs: jobs.map((j) => ({ title: j.job.title, description: j.job.description, markets: j.markets })),
  }));
  found.sort((a, b) => b.jobs.length - a.jobs.length);

  const mb = (bytes / 1_048_576).toFixed(0);
  console.log(`Feed: ${total.toLocaleString()} jobs, ${mb} MB, read in ${Math.round((Date.now() - started) / 1000)}s.`);
  console.log(`Sales jobs in US/CA/UK posted in the last ${RECENT_DAYS} days: ${sales.toLocaleString()} across ${found.length.toLocaleString()} companies.`);
  const byMarket = (m: string) => found.filter((f) => f.jobs.some((j) => j.markets.includes(m))).length;
  console.log(`Companies by market: US ${byMarket("US")}, CA ${byMarket("CA")}, UK ${byMarket("UK")}.`);
  const flagged = found.filter((f) => candidateNote(f.name, f.jobs.map((j) => j.title), f.jobs.map((j) => j.description)));
  console.log(`Flagged for a closer look (recruiter, consumer or field sales...): ${flagged.length}. Clean: ${found.length - flagged.length}.`);
  console.log("Most sales jobs, clean:");
  for (const f of found.filter((x) => !flagged.includes(x)).slice(0, 40)) console.log(`  ${String(f.jobs.length).padStart(3)}  ${f.name} (${f.identifier}) · ${[...new Set(f.jobs.map((j) => j.title))].slice(0, 3).join(" | ")}`);

  if (dry) return;
  const db = adminClient();
  const r = await saveCandidates(db, found);
  notice(`Workable discovery: ${r.added} new companies to review, ${r.refreshed} refreshed, ${r.skipped} already on Braun Board.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
