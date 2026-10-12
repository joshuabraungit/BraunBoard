// Crawl stale companies, store new sales jobs, then send instant alerts.
// Usage: npm run ingest                 (companies not crawled in 4h)
//        npm run ingest -- --all        (ignore staleness, crawl everything)
//        npm run ingest -- --reprocess  (crawl everything AND re-apply current rules to stored jobs)

import { adminClient } from "../src/lib/supabase/admin";
import { ingestAll } from "../src/lib/ingest/pipeline";
import { sendPendingAlerts } from "../src/lib/alerts/send";
import { recomputeFlags } from "../src/lib/flags-db";
import { fail, notice, requireEnv } from "./report";

async function main() {
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");
  const db = adminClient();
  const all = process.argv.includes("--all");
  const reprocess = process.argv.includes("--reprocess");
  const { companies, totals } = await ingestAll(db, { staleAfterHours: all || reprocess ? 0 : 4, reprocess });
  notice(`Ingest: crawled ${companies} companies, ${totals.kept} US sales jobs seen, ${totals.new} new, ${totals.removed} removed`);
  const f = await recomputeFlags(db);
  notice(`Flags: ${f.changed} of ${f.checked} jobs updated`);
  const sent = await sendPendingAlerts(db, "instant");
  console.log(`Sent ${sent} instant alert emails`);
}

main().catch(fail);
