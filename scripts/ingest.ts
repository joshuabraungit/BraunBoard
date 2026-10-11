// Crawl stale companies, store new sales jobs, then send instant alerts.
// Usage: npm run ingest            (companies not crawled in 4h)
//        npm run ingest -- --all   (ignore staleness, crawl everything)

import { adminClient } from "../src/lib/supabase/admin";
import { ingestAll } from "../src/lib/ingest/pipeline";
import { sendPendingAlerts } from "../src/lib/alerts/send";
import { fail, notice, requireEnv } from "./report";

async function main() {
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");
  const db = adminClient();
  const all = process.argv.includes("--all");
  const { companies, totals } = await ingestAll(db, { staleAfterHours: all ? 0 : 4 });
  notice(`Ingest: crawled ${companies} companies, ${totals.kept} US sales jobs seen, ${totals.new} new, ${totals.removed} removed`);
  const sent = await sendPendingAlerts(db, "instant");
  console.log(`Sent ${sent} instant alert emails`);
}

main().catch(fail);
