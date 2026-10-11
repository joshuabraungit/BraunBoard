// Alert email rendering + delivery. Spec section 13. Email only in V1.

import { formatComp } from "../format";

export interface AlertItem {
  job_slug: string;
  title: string;
  company: string;
  score: number | null;
  salary_min: number | null;
  salary_max: number | null;
  ote_min: number | null;
  ote_max: number | null;
  remote_type: string;
  location: string | null;
  match_id: string;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function renderAlert(watchName: string, items: AlertItem[], siteUrl: string) {
  const n = items.length;
  const subject = `${n} new job${n === 1 ? "" : "s"} match${n === 1 ? "es" : ""} your ${watchName} watch`;
  const rows = items
    .map((i) => {
      const comp = formatComp(i);
      const where = i.remote_type === "Remote" ? "Remote" : i.location ?? "";
      const meta = [comp, where].filter(Boolean).join(" · ");
      // Click goes through our redirect so we can measure alert -> detail clicks (primary V1 metric).
      const href = `${siteUrl}/r/${i.match_id}`;
      return `<tr><td style="padding:14px 0;border-bottom:1px solid #eee">
        <a href="${href}" style="color:#111;text-decoration:none;font-weight:600">${i.score != null ? `${i.score}% · ` : ""}${esc(i.title)} · ${esc(i.company)}</a>
        <div style="color:#555;font-size:14px;margin-top:4px">${esc(meta)}</div></td></tr>`;
    })
    .join("");
  const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:#faf8f5;padding:24px">
  <table width="100%" style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:10px;padding:24px">
  <tr><td><div style="font-size:13px;color:#888">Braun Board</div><h1 style="font-size:20px;margin:6px 0 10px">${esc(subject)}</h1></td></tr>
  ${rows}
  <tr><td style="padding-top:18px"><a href="${siteUrl}/watchlist" style="color:#111;font-weight:600">See all matches →</a></td></tr>
  <tr><td style="padding-top:24px;font-size:12px;color:#999">You're getting this because you watch "${esc(watchName)}". <a href="${siteUrl}/alerts" style="color:#999">Change alert frequency</a></td></tr>
  </table></body></html>`;
  const text = `${subject}\n\n${items
    .map((i) => `${i.score != null ? `${i.score}% - ` : ""}${i.title} - ${i.company}\n${formatComp(i)}\n${siteUrl}/r/${i.match_id}`)
    .join("\n\n")}\n\nSee all matches: ${siteUrl}/watchlist`;
  return { subject, html, text };
}

/** Sends through Resend's HTTP API. Swap for any provider with the same signature. */
export async function sendEmail(to: string, msg: { subject: string; html: string; text: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[email:dry-run] to=${to} subject="${msg.subject}"`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.ALERTS_FROM ?? "Braun Board <alerts@joshbraun.com>", to, ...msg }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}
