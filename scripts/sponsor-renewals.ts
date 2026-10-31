// "A week left" emails for sponsored jobs. Hourly runner: npx tsx scripts/sponsor-renewals.ts
import { adminClient } from "../src/lib/supabase/admin";
import { sendRenewalReminders } from "../src/lib/sponsor-renew";
import { fail, notice, requireEnv } from "./report";

async function main() {
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");
  const n = await sendRenewalReminders(adminClient());
  if (n) notice(`Sponsor renewal reminders: ${n} sent`);
  else console.log("Sponsor renewal reminders: none due.");
}

main().catch(fail);
