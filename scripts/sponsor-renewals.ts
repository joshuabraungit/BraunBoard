// Sponsor wrap-up email: one email, about 5 days before a run ends (results, how the hire went,
// feedback, free Tongue Tied deck). The end-of-run thank-you is off on purpose: one email, not two.
// Hourly runner: npx tsx scripts/sponsor-renewals.ts
import { adminClient } from "../src/lib/supabase/admin";
import { sendRenewalReminders } from "../src/lib/sponsor-renew";
import { fail, notice, requireEnv } from "./report";

async function main() {
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");
  const db = adminClient();
  const n = await sendRenewalReminders(db);
  if (n) notice(`Sponsor wrap-up emails: ${n} sent`);
  else console.log("Sponsor wrap-up emails: none due.");
}

main().catch(fail);
