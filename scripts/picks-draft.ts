// Monday: build Tuesday's Braun's Picks and email Josh a preview.
// Never overwrites an issue that already exists (so manual edits are safe).
import { adminClient } from "../src/lib/supabase/admin";
import { createDraft, lastTakeError } from "../src/lib/picks-db";
import { renderPicks, type ItemContent } from "../src/lib/picks-email";
import { sendEmail } from "../src/lib/alerts/email";
import { adminEmails } from "../src/lib/admin-emails";
import { fail, notice, requireEnv, warn } from "./report";

async function main() {
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");
  const db = adminClient();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.braunboard.com";
  const r = await createDraft(db);
  if (!r.created) return notice(`Picks for ${r.issueDate} already exist (${r.picks} picks). Left as is.`);
  if (lastTakeError) warn(`Some takes used the plain template because the AI call failed: ${lastTakeError}`);
  if (r.picks < 3) warn(`Only ${r.picks} jobs qualified for Picks this week.`);

  const { data: issue } = await db.from("picks_issues").select("subject, intro, stat_line, issue_date, send_at").eq("id", r.issueId).single();
  const { data: items } = await db.from("picks_items").select("id, kind, title, company, pay, meta, take").eq("issue_id", r.issueId).order("kind").order("position");
  const email = renderPicks(issue!, (items ?? []) as ItemContent[], { siteUrl: site, subscriberId: "preview" });
  const banner = `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto 16px;padding:14px 16px;border-radius:10px;background:#16140f;color:#fff;font-size:14px;line-height:1.5">
    <b>Preview.</b> This goes out Tuesday at 8am ET on its own. Want to change a pick, edit a take, or pause this week?
    <a href="${site}/admin/picks/${r.issueId}" style="color:#9fe0b5;font-weight:700">Open it in Admin &rarr;</a></div>`;
  for (const to of adminEmails()) {
    await sendEmail(to, {
      subject: `[Preview] ${email.subject}`,
      html: email.html.replace(/<body([^>]*)>/, `<body$1>${banner}`),
      text: `PREVIEW. Goes out Tuesday 8am ET. Edit or pause: ${site}/admin/picks/${r.issueId}\n\n${email.text}`,
    });
  }
  notice(`Picks for ${r.issueDate}: ${r.picks} picks${r.hasSkip ? " + one to skip" : ""}. Preview sent to ${adminEmails().join(", ")}.`);
}

main().catch(fail);
