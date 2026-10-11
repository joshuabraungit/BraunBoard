// Crawl stale companies, store new sales jobs, then send instant alerts.
// Usage: npm run ingest            (companies not crawled in 4h)
//        npm run ingest -- --all   (ignore staleness, crawl everything)

import { adminClient } from "../src/lib/supabase/admin";
import { ingestAll } from "../src/lib/ingest/pipeline";
import { sendPendingAlerts } from "../src/lib/alerts/send";

async function main() {
  const db = adminClient();
  const all = process.argv.includes("--all");
  const { companies, totals } = await ingestAll(db, { staleAfterHours: all ? 0 : 4 });
  console.log(`\nCrawled ${companies} companies: ${totals.kept} sales jobs seen, ${totals.new} new, ${totals.removed} removed`);
  const sent = await sendPendingAlerts(db, "instant");
  console.log(`Sent ${sent} instant alert emails`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
