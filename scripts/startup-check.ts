// Read-only check of startups we might add: does each one have a job board we can read,
// and is it hiring a sales role in the US, Canada or the UK right now? Nothing goes on the site.
// Results land in the startup_candidates table for review.
// Usage: npx tsx scripts/startup-check.ts data/startups-2026-10.csv
// Columns: name,domain,note

import { readFileSync } from "node:fs";
import { adminClient } from "../src/lib/supabase/admin";
import { detectByProbing } from "../src/lib/ingest/detect-ats";
import { adapters } from "../src/lib/ingest/adapters";
import { classifyTitle } from "../src/lib/ingest/classify";
import { locate } from "../src/lib/ingest/pipeline";
import { titleOutOfMarket } from "../src/lib/ingest/location";
import { slugify } from "../src/lib/slug";
import { fail, notice, requireEnv } from "./report";

async function main() {
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");
  const file = process.argv[2] ?? "data/startups-2026-10.csv";
  const [header, ...lines] = readFileSync(file, "utf8").trim().split(/\r?\n/);
  const cols = header.split(",").map((c) => c.trim());
  const rows = lines.filter((l) => l.trim() && !l.startsWith("#")).map((l) => {
    const v = l.split(",");
    return Object.fromEntries(cols.map((c, i) => [c, (v[i] ?? "").trim()])) as { name: string; domain: string; note?: string };
  });
  const db = adminClient();

  // Skip companies already on Braun Board, by name or domain.
  const { data: have } = await db.from("companies").select("slug, domain").range(0, 9999);
  const slugs = new Set((have ?? []).map((c) => c.slug as string));
  const domains = new Set((have ?? []).map((c) => (c.domain as string | null)?.toLowerCase()).filter(Boolean));
  const todo = rows.filter((r) => !slugs.has(slugify(r.name)) && !domains.has(r.domain.toLowerCase()));

  let hiring = 0, boards = 0;
  const queue = [...todo];
  const worker = async () => {
    for (let r = queue.shift(); r; r = queue.shift()) {
      const out: Record<string, unknown> = { name: r.name, domain: r.domain || null, note: r.note ?? null, checked_at: new Date().toISOString() };
      try {
        const found = await detectByProbing(r.name, r.domain || null);
        if (found) Object.assign(out, { provider: found.provider, identifier: found.identifier, verified: found.verified });
        if (found?.verified) {
          boards++;
          const jobs = await adapters[found.provider].fetchJobs({ id: "check", name: r.name, ats_provider: found.provider, ats_identifier: found.identifier });
          const sales = jobs.filter((j) => {
            const loc = locate(j);
            return classifyTitle(j.title) && loc.markets.length && !titleOutOfMarket(j.title, loc.markets);
          });
          Object.assign(out, { total_jobs: jobs.length, sales_jobs: sales.length, sales_titles: sales.slice(0, 8).map((j) => j.title) });
          if (sales.length) hiring++;
        }
      } catch (e) {
        out.error = (e as Error).message.slice(0, 300);
      }
      await db.from("startup_candidates").upsert(out, { onConflict: "name" });
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  notice(`Startup check: ${rows.length} in the list, ${rows.length - todo.length} already on Braun Board, ${todo.length} checked. ${boards} have a board we can read, ${hiring} are hiring sales in the US, Canada or UK.`);
}

main().catch(fail);
