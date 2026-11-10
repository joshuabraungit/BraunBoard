// Renders a Braun's Picks issue as email HTML + plain text.
import { cleanTitle } from "./picks";

export interface IssueContent {
  subject: string;
  intro: string;
  /** A line or two from Josh above the list. Optional. */
  opener?: string | null;
  stat_line: string | null;
  issue_date: string;
  /** An optional callout right under the intro, e.g. a Fast Track offer. */
  spotlight?: Spotlight | null;
}
export interface Spotlight {
  label: string;
  title: string;
  text: string;
  url: string;
  cta: string;
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

/** Live details from the job, looked up when the email is built (see loadItemExtras). All optional. */
export interface PickExtras {
  /** Location and segment, recomputed with today's rules. Beats the stored meta. */
  meta?: string | null;
  /** "New Business", "Account Growth", "New Business + Account Growth", "Partnerships". */
  motion?: string | null;
  sells?: string | null;
  sellsTo?: string | null;
  /** The one light worth knowing about: a red first, then a yellow, then the best green. */
  light?: { tone: "green" | "yellow" | "red"; text: string } | null;
  /** When the employer posted it, for the life meter. */
  postedAt?: string | null;
}

/** Mailing address required in commercial email footers (CAN-SPAM). */
const POSTAL_ADDRESS = "Braun Board, 5566 Marbella Dr., Boca Raton, FL 33433";
export const postalAddress = () => process.env.PICKS_POSTAL_ADDRESS?.trim() || POSTAL_ADDRESS;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

const DOT = { green: "#2f9e5b", yellow: "#e0a800", red: "#d64545" } as const;
const LIGHT_WORD = { green: "Green light", yellow: "Yellow light", red: "Red light" } as const;
const MOTION_ICON: Record<string, string> = { "New Business": "✨", "Account Growth": "🌱", "New Business + Account Growth": "✨🌱", Partnerships: "🤝" };

/** If the skip was dropped, the headline shouldn't still promise one. */
export function honestIntro(intro: string, hasSkip: boolean): string {
  return hasSkip ? intro : intro.replace(/,?\s*and one I'?d skip\b/i, "");
}

function daysOpen(postedAt: string | null | undefined, issueDate: string): number | null {
  if (!postedAt) return null;
  const sendDay = new Date(`${issueDate}T12:00:00Z`).getTime();
  return Math.max(0, Math.floor((sendDay - new Date(postedAt).getTime()) / 86_400_000));
}
const openWords = (d: number) => (d <= 1 ? "Posted this week" : `Open ${d} days`);

/** The site's life meter, in email-safe HTML. Picks are under two weeks old, but this follows the site's scale anyway. */
function lifeMeterHtml(d: number): string {
  const bars = d <= 7 ? 5 : d <= 14 ? 4 : d <= 30 ? 3 : d <= 45 ? 2 : d <= 60 ? 1 : 0;
  const color = bars >= 4 ? DOT.green : bars >= 2 ? DOT.yellow : DOT.red;
  return Array.from(
    { length: 5 },
    (_, i) => `<span style="display:inline-block;width:5px;height:10px;margin-right:2px;border-radius:1px;background:${i < bars ? color : "#d8d4cc"};vertical-align:-1px"></span>`,
  ).join("");
}

export function renderPicks(
  issue: IssueContent,
  items: ItemContent[],
  opts: { siteUrl: string; subscriberId: string; extras?: Map<string, PickExtras> },
) {
  const { siteUrl, subscriberId } = opts;
  const extras = opts.extras ?? new Map<string, PickExtras>();
  const picks = items.filter((i) => i.kind === "pick");
  const skip = items.find((i) => i.kind === "skip");
  const link = (i: ItemContent) => `${siteUrl}/p/${i.id}?s=${encodeURIComponent(subscriberId)}`;
  const unsubscribe = `${siteUrl}/picks/unsubscribe?s=${encodeURIComponent(subscriberId)}`;
  const oneClick = `${siteUrl}/api/picks/unsubscribe?s=${encodeURIComponent(subscriberId)}`;
  const signup = `${siteUrl}/picks?from=forward`;
  const coldEmails = `${siteUrl}/outreach?from=picks-email`;
  const date = new Date(`${issue.issue_date}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const address = postalAddress();
  const intro = honestIntro(issue.intro, !!skip);
  const opener = issue.opener?.trim() || null;
  const spot = issue.spotlight && issue.spotlight.title && /^https?:\/\//.test(issue.spotlight.url) ? issue.spotlight : null;

  const label = "color:#888";
  const pickHtml = picks
    .map((p, i) => {
      const x = extras.get(p.id) ?? {};
      const meta = x.meta ?? p.meta;
      const d = daysOpen(x.postedAt, issue.issue_date);
      const tags = [
        meta ? esc(meta) : null,
        x.motion ? `${MOTION_ICON[x.motion] ?? ""} ${esc(x.motion)}`.trim() : null,
        d != null ? `<span style="white-space:nowrap">${lifeMeterHtml(d)} ${openWords(d)}</span>` : null,
      ].filter(Boolean);
      return `<tr><td style="padding:18px 0;border-bottom:1px solid #eee">
      <div style="font-size:12px;color:#888;font-weight:600">${i + 1}</div>
      <a href="${link(p)}" style="color:#111;text-decoration:none;font-size:17px;font-weight:700">${esc(cleanTitle(p.title))}${p.company ? ` · ${esc(p.company)}` : ""}</a>
      <div style="margin-top:4px;color:#1f5c3a;font-weight:600;font-size:15px">${esc(p.pay ?? "")}</div>
      ${tags.length ? `<div style="margin-top:3px;color:#777;font-size:13px;line-height:1.6">${tags.join(" · ")}</div>` : ""}
      ${x.sells ? `<div style="margin-top:8px;font-size:14px;line-height:1.45;color:#333"><span style="${label}">What you'd sell:</span> ${esc(x.sells.replace(/\.\s*$/, ""))}</div>` : ""}
      ${x.sellsTo ? `<div style="margin-top:2px;font-size:14px;line-height:1.45;color:#333"><span style="${label}">Who you'd sell to:</span> ${esc(x.sellsTo)}</div>` : ""}
      ${
        x.light
          ? `<div style="margin-top:8px;font-size:14px;color:#333"><span style="display:inline-block;width:10px;height:10px;border-radius:5px;background:${DOT[x.light.tone]};vertical-align:-1px;margin-right:6px"></span><b>${LIGHT_WORD[x.light.tone]}:</b> ${esc(x.light.text)}</div>`
          : ""
      }
      <p style="margin:10px 0 0;font-size:15px;line-height:1.5;color:#222"><b>Josh's take:</b> ${esc(p.take)}</p>
      <a href="${link(p)}" style="display:inline-block;margin-top:8px;font-size:14px;font-weight:600;color:#111">See the full Braun Read &rarr;</a>
    </td></tr>`;
    })
    .join("");

  const html = `<!doctype html><html><body style="margin:0;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:#faf8f4;padding:24px">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #ebe7df;border-radius:12px;padding:28px">
  <tr><td>
    <div style="font-size:12px;color:#888;font-weight:700;letter-spacing:.04em;text-transform:uppercase">Braun's Picks · ${esc(date)}</div>
    <h1 style="font-size:22px;line-height:1.3;margin:8px 0 6px">${esc(intro)}</h1>
    ${opener ? `<p style="margin:10px 0 4px;font-size:15px;line-height:1.55;color:#333">${esc(opener)}</p>` : ""}
    <p style="margin:10px 0 0;font-size:12px;color:#888">
      <span style="display:inline-block;width:8px;height:8px;border-radius:4px;background:${DOT.green}"></span> good sign &nbsp;
      <span style="display:inline-block;width:8px;height:8px;border-radius:4px;background:${DOT.yellow}"></span> ask about it &nbsp;
      <span style="display:inline-block;width:8px;height:8px;border-radius:4px;background:${DOT.red}"></span> watch out
    </p>
  </td></tr>
  ${
    spot
      ? `<tr><td style="padding:18px 0 4px">
      <div style="border:2px solid #111;border-radius:10px;padding:16px 18px">
        <div style="font-size:12px;color:#1f5c3a;font-weight:700;letter-spacing:.04em;text-transform:uppercase">${esc(spot.label)}</div>
        <div style="margin-top:6px;font-size:17px;font-weight:700;line-height:1.35;color:#111">${esc(spot.title)}</div>
        <p style="margin:8px 0 0;font-size:15px;line-height:1.55;color:#222">${esc(spot.text)}</p>
        <a href="${esc(spot.url)}" style="display:inline-block;margin-top:12px;background:#111;color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:10px 16px;border-radius:8px">${esc(spot.cta)}</a>
      </div>
    </td></tr>`
      : ""
  }
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
  <tr><td style="padding:20px 0;border-bottom:1px solid #eee">
    <div style="font-size:12px;color:#888;font-weight:700;letter-spacing:.04em;text-transform:uppercase">Before you go</div>
    <p style="margin:6px 0 0;font-size:15px;line-height:1.55;color:#222">Going after one of these? Hit reply and tell me which. I read every one.</p>
    <p style="margin:10px 0 0;font-size:15px;line-height:1.55;color:#222">Don't just hit Apply. <a href="${coldEmails}" style="color:#111;font-weight:600">Send the hiring manager a cold email &rarr;</a></p>
    <p style="margin:10px 0 0;font-size:15px;line-height:1.55;color:#222">Know a rep who's looking? Forward this. They can <a href="${signup}" style="color:#111;font-weight:600">get their own copy here</a>.</p>
  </td></tr>
  <tr><td style="padding-top:20px;font-size:14px"><a href="${siteUrl}/jobs" style="color:#111;font-weight:600">Browse every sales job on Braun Board &rarr;</a></td></tr>
  <tr><td style="padding-top:10px;font-size:14px;color:#555">Interviewing for your first AE role? <a href="${siteUrl}/kit?from=picks-email" style="color:#111;font-weight:600">Get the free interview kit &rarr;</a></td></tr>
  <tr><td style="padding-top:24px;font-size:12px;line-height:1.5;color:#999">
    You're getting this because you signed up for Braun's Picks at braunboard.com.
    <a href="${unsubscribe}" style="color:#999">Unsubscribe</a> anytime, one click.
    ${address ? `<br>${esc(address)}` : ""}
  </td></tr>
  </table></body></html>`;

  const text = [
    `BRAUN'S PICKS · ${date}`,
    intro,
    ...(opener ? ["", opener] : []),
    "",
    ...(spot ? [spot.label.toUpperCase(), spot.title, spot.text, `${spot.cta.replace(/\s*→\s*$/, "")}: ${spot.url}`, ""] : []),
    ...picks.flatMap((p, i) => {
      const x = extras.get(p.id) ?? {};
      const d = daysOpen(x.postedAt, issue.issue_date);
      const tags = [x.meta ?? p.meta, x.motion, d != null ? openWords(d) : null].filter(Boolean).join(" · ");
      return [
        `${i + 1}. ${cleanTitle(p.title)}${p.company ? ` · ${p.company}` : ""}`,
        p.pay ?? "",
        ...(tags ? [tags] : []),
        ...(x.sells ? [`What you'd sell: ${x.sells.replace(/\.\s*$/, "")}`] : []),
        ...(x.sellsTo ? [`Who you'd sell to: ${x.sellsTo}`] : []),
        ...(x.light ? [`${LIGHT_WORD[x.light.tone]}: ${x.light.text}`] : []),
        `Josh's take: ${p.take}`,
        `See the full Braun Read: ${link(p)}`,
        "",
      ];
    }),
    ...(skip ? ["ONE TO SKIP", skip.take, ""] : []),
    ...(issue.stat_line ? ["THIS WEEK'S NUMBER", issue.stat_line, ""] : []),
    "BEFORE YOU GO",
    "Going after one of these? Hit reply and tell me which. I read every one.",
    `Don't just hit Apply. Send the hiring manager a cold email: ${coldEmails}`,
    `Know a rep who's looking? Forward this. They can get their own copy: ${signup}`,
    "",
    `Browse every sales job: ${siteUrl}/jobs`,
    `Free first-AE interview kit: ${siteUrl}/kit`,
    "",
    `Unsubscribe: ${unsubscribe}`,
    address,
  ]
    .filter((l) => l !== undefined)
    .join("\n");

  return { subject: issue.subject, html, text, unsubscribe, oneClick };
}
