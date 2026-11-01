// One-off: which sales and partnerships titles in our markets does the classifier drop today?
// Read-only. Fetches every enabled board, saves nothing, prints the dropped titles.
import { appendFileSync } from "node:fs";
import { adminClient } from "../src/lib/supabase/admin";
import { adapters } from "../src/lib/ingest/adapters";
import { classifyTitle } from "../src/lib/ingest/classify";
import { locate } from "../src/lib/ingest/pipeline";
import { ENABLED_PROVIDERS } from "../src/lib/ingest/providers";
import type { CompanyRef } from "../src/lib/ingest/types";
import { fail, requireEnv } from "./report";

const PARTNER = /\b(partner|partners|partnerships?|channel|alliances?|resellers?|ecosystems?)\b/i;
const SALES = /\b(sales|account (executive|manager|director)|business development|new business|revenue|commercial|quota|closing|sdr|bdr|go[- ]to[- ]market|gtm)\b/i;

async function main() {
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");
  const db = adminClient();
  const { data: companies, error } = await db.from("companies").select("id, name, ats_provider, ats_identifier").eq("is_disabled", false).in("ats_provider", ENABLED_PROVIDERS);
  if (error) throw error;
  const partner: string[] = [];
  const sales: string[] = [];
  const queue = [...((companies ?? []) as CompanyRef[])];
  const worker = async () => {
    for (let c = queue.shift(); c; c = queue.shift()) {
      try {
        for (const j of await adapters[c.ats_provider].fetchJobs(c)) {
          if (!locate(j).markets.length || classifyTitle(j.title)) continue;
          const line = `${j.title} @ ${c.name}`;
          if (PARTNER.test(j.title)) partner.push(line);
          else if (SALES.test(j.title)) sales.push(line);
        }
      } catch {
        /* skip a board that fails */
      }
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  const out = ["# Dropped partnerships titles", `count: ${partner.length}`, ...partner.sort(), "", "# Dropped sales titles", `count: ${sales.length}`, ...sales.sort()];
  console.log(out.join("\n"));
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, out.join("\n") + "\n");
}
main().catch(fail);
