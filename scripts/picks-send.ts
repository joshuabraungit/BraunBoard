// Tuesday: send any scheduled Braun's Picks issue whose time has come.
import { adminClient } from "../src/lib/supabase/admin";
import { postalAddress, renderPicks, type ItemContent } from "../src/lib/picks-email";
import { fail, notice, requireEnv } from "./report";

const FROM = process.env.PICKS_FROM ?? "Braun's Picks <picks@braunboard.com>";

async function sendBatch(key: string, emails: object[]) {
  const res = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(emails),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

async function main() {
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "RESEND_API_KEY");
  if (!postalAddress()) fail(new Error("Picks needs a mailing address in the footer before it can go out (US CAN-SPAM law). Add it to POSTAL_ADDRESS in src/lib/picks-email.ts; a PO box is fine."));
  const db = adminClient();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.braunboard.com";
  const now = new Date();

  // Claim due issues atomically so two runs can't double-send.
  const { data: due } = await db
    .from("picks_issues")
    .update({ status: "sending" })
    .eq("status", "scheduled")
    .lte("send_at", now.toISOString())
    .gte("send_at", new Date(now.getTime() - 36 * 3_600_000).toISOString())
    .select("id, subject, intro, stat_line, issue_date");
  if (!due?.length) return notice("Picks: nothing due to send.");

  for (const issue of due) {
    const { data: items } = await db.from("picks_items").select("id, kind, title, company, pay, meta, take").eq("issue_id", issue.id).order("kind").order("position");
    const subs: { id: string; email: string }[] = [];
    for (let from = 0; ; from += 1000) {
      const { data } = await db.from("picks_subscribers").select("id, email").eq("status", "active").order("created_at").range(from, from + 999);
      subs.push(...((data ?? []) as { id: string; email: string }[]));
      if (!data || data.length < 1000) break;
    }
    let sent = 0;
    for (let i = 0; i < subs.length; i += 100) {
      const batch = subs.slice(i, i + 100).map((s) => {
        const e = renderPicks(issue, (items ?? []) as ItemContent[], { siteUrl: site, subscriberId: s.id });
        return {
          from: FROM,
          to: [s.email],
          subject: e.subject,
          html: e.html,
          text: e.text,
          headers: { "List-Unsubscribe": `<${e.oneClick}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
        };
      });
      await sendBatch(process.env.RESEND_API_KEY!, batch);
      sent += batch.length;
    }
    await db.from("picks_issues").update({ status: "sent", sent_at: new Date().toISOString(), recipients: sent }).eq("id", issue.id);
    notice(`Picks for ${issue.issue_date} sent to ${sent} subscribers.`);
  }
}

main().catch(fail);
