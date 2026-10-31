// Sponsor emails: "5 days left" with a renew link, and a thank-you the day a run ends. Hourly runner: npx tsx scripts/sponsor-renewals.ts
import { adminClient } from "../src/lib/supabase/admin";
import { sendEndOfRunThanks, sendRenewalReminders } from "../src/lib/sponsor-renew";
import { fail, notice, requireEnv } from "./report";

async function main() {
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");
  const db = adminClient();
  const n = await sendRenewalReminders(db);
  if (n) notice(`Sponsor renewal reminders: ${n} sent`);
  else console.log("Sponsor renewal reminders: none due.");
  const t = await sendEndOfRunThanks(db);
  if (t) notice(`Sponsor thank-you emails: ${t} sent`);
  else console.log("Sponsor thank-you emails: none due.");
}

main().catch(fail);
