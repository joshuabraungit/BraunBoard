// Daily digest. Usage: npm run digest            (send now)
//                      npm run digest -- --if-due (hourly runner: once a day, first run after 8am ET)
import { adminClient } from "../src/lib/supabase/admin";
import { sendPendingAlerts } from "../src/lib/alerts/send";
import { claimRun, nyNow } from "../src/lib/schedule";
import { fail, notice, requireEnv } from "./report";

async function main() {
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");
  const db = adminClient();
  if (process.argv.includes("--if-due")) {
    const ny = nyNow();
    if (ny.hour < 8) return console.log("Digest: not 8am ET yet.");
    if (!(await claimRun(db, "digest", ny.date))) return console.log(`Digest: already sent for ${ny.date}.`);
  }
  const n = await sendPendingAlerts(db, "daily");
  notice(`Daily digest: ${n} emails sent`);
}

main().catch(fail);
