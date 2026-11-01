// Company discovery from a list: any CSV of company names (from Lusha, a VC portfolio, a list you
// pasted). Finds each company's own Greenhouse, Lever or Ashby board, confirms it's theirs, counts
// sales jobs in our markets, and puts the ones that are hiring in Admin > Discover for a yes or no.
// Nothing is added to the site directly.
// Usage: npx tsx scripts/discover-boards.ts data/some-list.csv [--dry-run]
// Columns: name,domain[,careers_url]

import { readFileSync } from "node:fs";
import { adminClient } from "../src/lib/supabase/admin";
import { adapters } from "../src/lib/ingest/adapters";
import { detectByProbing, detectFromUrl } from "../src/lib/ingest/detect-ats";
import { ENABLED_PROVIDERS } from "../src/lib/ingest/providers";
import { inScopeSalesJob, normalizeDomain, saveCandidates, type FoundCompany } from "../src/lib/ingest/discover";
import { notice, requireEnv, warn } from "./report";

function parseCsv(text: string): Record<string, string>[] {
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const cols = header!.split(",").map((c) => c.trim().toLowerCase());
  return lines
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((line) => Object.fromEntries(cols.map((c, i) => [c, (line.split(",")[i] ?? "").trim()])));
}

async function main() {
  const file = process.argv[2];
  const dry = process.argv.includes("--dry-run");
  if (!file) throw new Error("Pass a CSV file: name,domain[,careers_url]");
  if (!dry) requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");
  const rows = parseCsv(readFileSync(file, "utf8"));

  const found: FoundCompany[] = [];
  const noBoard: string[] = [];
  const notHiring: string[] = [];
  const queue = [...rows];
  const worker = async () => {
    for (let r = queue.shift(); r; r = queue.shift()) {
      const domain = normalizeDomain(r.domain);
      let board = r.careers_url ? detectFromUrl(r.careers_url) : null;
      if (!board) {
        const probed = await detectByProbing(r.name!, domain);
        board = probed?.verified ? probed : null;
      }
      // Workable comes from its own feed (discover-workable.ts); Workday/SmartRecruiters stay off.
      if (!board || board.provider === "workable" || !ENABLED_PROVIDERS.includes(board.provider)) {
        noBoard.push(r.name!);
        continue;
      }
      try {
        const jobs = await adapters[board.provider].fetchJobs({ id: "", name: r.name!, ats_provider: board.provider, ats_identifier: board.identifier });
        const sales = jobs.flatMap((j) => {
          const ok = inScopeSalesJob(j);
          return ok ? [{ title: j.title, description: j.description, markets: ok.markets }] : [];
        });
        if (!sales.length) notHiring.push(r.name!);
        else found.push({ name: r.name!, domain, provider: board.provider, identifier: board.identifier, source: "list", jobs: sales });
      } catch (e) {
        warn(`${r.name}: found ${board.provider}/${board.identifier} but couldn't read it (${(e as Error).message})`);
      }
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));

  found.sort((a, b) => b.jobs.length - a.jobs.length);
  console.log(`${rows.length} companies: ${found.length} hiring salespeople, ${notHiring.length} with no sales jobs, ${noBoard.length} with no board we can read.`);
  for (const f of found.slice(0, 40)) console.log(`  ${String(f.jobs.length).padStart(3)}  ${f.name} (${f.provider}/${f.identifier})`);
  if (dry) return;
  const r = await saveCandidates(adminClient(), found);
  notice(`List discovery: ${r.added} new companies to review, ${r.refreshed} refreshed, ${r.skipped} already on Braun Board.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
