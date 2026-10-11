// Daily digest. Usage: npm run digest
import { adminClient } from "../src/lib/supabase/admin";
import { sendPendingAlerts } from "../src/lib/alerts/send";

sendPendingAlerts(adminClient(), "daily")
  .then((n) => console.log(`Sent ${n} daily digest emails`))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
