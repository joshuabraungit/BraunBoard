// Diagnostic: prints a turn-off link for a fake user, signed with the same secret the alert sender uses.
// If the live site accepts it, links in real alert emails will work too. The fake user has no alerts.
import { offUrl } from "../src/lib/alerts/off";
console.log(`::notice::${offUrl("https://www.braunboard.com", "00000000-0000-4000-8000-000000000000", null)}`);
