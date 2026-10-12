// Renders a Braun's Picks issue as email HTML + plain text.

export interface IssueContent {
  subject: string;
  intro: string;
  stat_line: string | null;
  issue_date: string;
}
export interface ItemContent {
  id: string;
  kind: "pick" | "skip";
  title: string;
  company: string | null;
  pay: string | null;
  meta: string | null;
  take: string;
}

/** Mailing address required in commercial email footers (CAN-SPAM). */
const POSTAL_ADDRESS = "";
export const postalAddress = () => process.env.PICKS_POSTAL_ADDRESS?.trim() || POSTAL_ADDRESS;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function renderPicks(issue: IssueContent, items: ItemContent[], opts: { siteUrl: string; subscriberId: string }) {
  const { siteUrl, subscriberId } = opts;
  const picks = items.filter((i) => i.kind === "pick");
  const skip = items.find((i) => i.kind === "skip");
  const link = (i: ItemContent) => `${siteUrl}/p/${i.id}?s=${encodeURIComponent(subscriberId)}`;
  const unsubscribe = `${siteUrl}/picks/unsubscribe?s=${encodeURIComponent(subscriberId)}`;
  const oneClick = `${siteUrl}/api/picks/unsubscribe?s=${encodeURIComponent(subscriberId)}`;
  const date = new Date(`${issue.issue_date}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const address = postalAddress();

  const pickHtml = picks
    .map(
      (p, i) => `<tr><td style="padding:18px 0;border-bottom:1px solid #eee">
      <div style="font-size:12px;color:#888;font-weight:600">${i + 1}</div>
      <a href="${link(p)}" style="color:#111;text-decoration:none;font-size:17px;font-weight:700">${esc(p.title)}${p.company ? ` · ${esc(p.company)}` : ""}</a>
      <div style="margin-top:4px;color:#1f5c3a;font-weight:600;font-size:15px">${esc(p.pay ?? "")}</div>
      ${p.meta ? `<div style="margin-top:2px;color:#777;font-size:13px">${esc(p.meta)}</div>` : ""}
      <p style="margin:10px 0 0;font-size:15px;line-height:1.5;color:#222"><b>Josh's take:</b> ${esc(p.take)}</p>
      <a href="${link(p)}" style="display:inline-block;margin-top:8px;font-size:14px;font-weight:600;color:#111">View job &rarr;</a>
    </td></tr>`,
    )
    .join("");

  const html = `<!doctype html><html><body style="margin:0;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:#faf8f4;padding:24px">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #ebe7df;border-radius:12px;padding:28px">
  <tr><td>
    <div style="font-size:12px;color:#888;font-weight:700;letter-spacing:.04em;text-transform:uppercase">Braun's Picks · ${esc(date)}</div>
    <h1 style="font-size:22px;line-height:1.3;margin:8px 0 6px">${esc(issue.intro)}</h1>
  </td></tr>
  ${pickHtml}
  ${
    skip
      ? `<tr><td style="padding:20px 0;border-bottom:1px solid #eee">
      <div style="font-size:12px;color:#b42318;font-weight:700;letter-spacing:.04em;text-transform:uppercase">One to skip</div>
      <p style="margin:6px 0 0;font-size:15px;line-height:1.5;color:#222">${esc(skip.take)}</p>
    </td></tr>`
      : ""
  }
  ${
    issue.stat_line
      ? `<tr><td style="padding:20px 0;border-bottom:1px solid #eee">
      <div style="font-size:12px;color:#888;font-weight:700;letter-spacing:.04em;text-transform:uppercase">This week's number</div>
      <p style="margin:6px 0 0;font-size:15px;line-height:1.5;color:#222">${esc(issue.stat_line)}</p>
    </td></tr>`
      : ""
  }
  <tr><td style="padding-top:20px;font-size:14px"><a href="${siteUrl}/jobs" style="color:#111;font-weight:600">Browse every sales job on Braun Board &rarr;</a></td></tr>
  <tr><td style="padding-top:24px;font-size:12px;line-height:1.5;color:#999">
    You're getting this because you signed up for Braun's Picks at braunboard.com.
    <a href="${unsubscribe}" style="color:#999">Unsubscribe</a> anytime, one click.
    ${address ? `<br>${esc(address)}` : ""}
  </td></tr>
  </table></body></html>`;

  const text = [
    `BRAUN'S PICKS · ${date}`,
    issue.intro,
    "",
    ...picks.flatMap((p, i) => [`${i + 1}. ${p.title}${p.company ? ` · ${p.company}` : ""}`, p.pay ?? "", p.meta ?? "", `Josh's take: ${p.take}`, link(p), ""]),
    ...(skip ? ["ONE TO SKIP", skip.take, ""] : []),
    ...(issue.stat_line ? ["THIS WEEK'S NUMBER", issue.stat_line, ""] : []),
    `Browse every sales job: ${siteUrl}/jobs`,
    "",
    `Unsubscribe: ${unsubscribe}`,
    address,
  ]
    .filter((l) => l !== undefined)
    .join("\n");

  return { subject: issue.subject, html, text, unsubscribe, oneClick };
}
