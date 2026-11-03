// One-off email send through Resend. Test mode only sends to TEST_TO.
// Run from GitHub Actions: "One-off email" workflow, mode = test.
import { postalAddress } from "../src/lib/picks-email";
import { adminEmails } from "../src/lib/admin-emails";
import { fail, notice, requireEnv } from "./report";
import * as email from "./oneoff/embold";

const FROM = process.env.ONEOFF_FROM ?? "Josh Braun <picks@braunboard.com>";
const REPLY_TO = process.env.PICKS_REPLY_TO ?? adminEmails()[0];

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function render(siteUrl: string, unsubscribe: string) {
  const address = postalAddress();
  const body = email.blocks
    .map((b) => {
      if (b === "[[LINK]]")
        return `<p style="margin:22px 0"><a href="${email.jobUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;font-weight:600;padding:12px 18px;border-radius:8px">See the full job &rarr;</a></p>`;
      if (b.startsWith("## ")) return `<p style="margin:24px 0 6px;font-size:16px;font-weight:700;color:#111">${esc(b.slice(3))}</p>`;
      return `<p style="margin:0 0 12px;font-size:16px;line-height:1.55;color:#222">${esc(b)}</p>`;
    })
    .join("\n");
  const html = `<!doctype html><html><body style="margin:0;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:#faf8f4;padding:24px">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #ebe7df;border-radius:12px;padding:28px">
  <tr><td>${body}</td></tr>
  <tr><td style="padding-top:24px;font-size:12px;line-height:1.5;color:#999">
    You're getting this because you signed up at braunboard.com.
    <a href="${unsubscribe}" style="color:#999">Unsubscribe</a> anytime.
    ${address ? `<br>${esc(address)}` : ""}
  </td></tr></table></body></html>`;
  const text = [
    ...email.blocks.map((b) => (b === "[[LINK]]" ? `See the full job: ${email.jobUrl}` : b.replace(/^## /, ""))).flatMap((l) => [l, ""]),
    `Unsubscribe: ${unsubscribe}`,
    address,
  ].join("\n");
  void siteUrl;
  return { html, text };
}

async function main() {
  requireEnv("RESEND_API_KEY");
  const mode = process.env.MODE ?? "test";
  if (mode !== "test") fail(new Error("Only test mode is set up so far. The full send comes after Josh approves the test."));
  const to = (process.env.TEST_TO ?? "").trim();
  if (!/^[^@\s]+@[^@\s]+$/.test(to)) fail(new Error("TEST_TO needs one email address."));
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.braunboard.com";
  const { html, text } = render(site, `${site}/picks/unsubscribe`);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], ...(REPLY_TO ? { reply_to: REPLY_TO } : {}), subject: `[TEST] ${email.subject}`, html, text }),
  });
  if (!res.ok) fail(new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`));
  notice(`Test sent to ${to}.`);
}

main().catch(fail);
