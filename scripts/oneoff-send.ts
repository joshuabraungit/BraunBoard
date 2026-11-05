// One-off email send through Resend.
// MODE=test sends to TEST_TO only. MODE=all sends to everyone on Braun Board:
// site accounts (alerts not turned off) + active Picks subscribers, deduped,
// minus anyone who opted out of one-off emails or already got this one.
import { adminClient } from "../src/lib/supabase/admin";
import { postalAddress } from "../src/lib/picks-email";
import { adminEmails } from "../src/lib/admin-emails";
import { optoutOneClick, optoutUrl } from "../src/lib/email-optout";
import { fail, notice, requireEnv } from "./report";
import * as email from "./oneoff/embold";

const CAMPAIGN = "embold-2026-11";
const FROM = process.env.ONEOFF_FROM ?? "Josh Braun <picks@braunboard.com>";
const REPLY_TO = process.env.PICKS_REPLY_TO ?? adminEmails()[0];

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Tag the job link so clicks from this email show up as "Email" (not "Direct") in visit counts.
function tagged(url: string) {
  const u = new URL(url);
  u.searchParams.set("utm_source", "newsletter");
  u.searchParams.set("utm_campaign", CAMPAIGN);
  return u.toString();
}

function render(unsubscribe: string) {
  const address = postalAddress();
  const jobUrl = tagged(email.jobUrl);
  const body = email.blocks
    .map((b) => {
      if (b === "[[LINK]]")
        return `<p style="margin:22px 0"><a href="${jobUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;font-weight:600;padding:12px 18px;border-radius:8px">See the full job &rarr;</a></p>`;
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
    ...email.blocks.map((b) => (b === "[[LINK]]" ? `See the full job: ${jobUrl}` : b.replace(/^## /, ""))).flatMap((l) => [l, ""]),
    `Unsubscribe: ${unsubscribe}`,
    address,
  ].join("\n");
  return { html, text };
}

function message(site: string, to: string, subject: string) {
  const { html, text } = render(optoutUrl(site, to));
  return {
    from: FROM,
    to: [to],
    ...(REPLY_TO ? { reply_to: REPLY_TO } : {}),
    subject,
    html,
    text,
    headers: { "List-Unsubscribe": `<${optoutOneClick(site, to)}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
  };
}

async function resend(path: string, body: unknown) {
  const res = await fetch(`https://api.resend.com${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

async function pageAll<T>(q: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await q(from, from + 999);
    if (error) throw new Error(`Supabase: ${JSON.stringify(error)}`);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

async function main() {
  requireEnv("RESEND_API_KEY");
  if (!postalAddress()) fail(new Error("Needs a mailing address in the footer."));
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.braunboard.com";
  const mode = process.env.MODE ?? "test";

  if (mode === "test") {
    const to = (process.env.TEST_TO ?? "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+$/.test(to)) fail(new Error("TEST_TO needs one email address."));
    await resend("/emails", message(site, to, `[TEST] ${email.subject}`));
    return notice(`Test sent to ${to}.`);
  }
  if (mode !== "all") fail(new Error(`Unknown MODE: ${mode}`));

  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");
  const db = adminClient();
  const profiles = await pageAll<{ email: string | null; alert_frequency: string | null }>((a, b) =>
    db.from("profiles").select("email, alert_frequency").order("created_at").range(a, b),
  );
  const subs = await pageAll<{ email: string }>((a, b) => db.from("picks_subscribers").select("email").eq("status", "active").order("created_at").range(a, b));
  const optouts = await pageAll<{ email: string }>((a, b) => db.from("email_optouts").select("email").range(a, b));
  const sent = await pageAll<{ email: string }>((a, b) => db.from("email_sends").select("email").eq("campaign", CAMPAIGN).range(a, b));

  const norm = (e: string | null) => (e ?? "").trim().toLowerCase();
  const skip = new Set([...optouts, ...sent].map((r) => norm(r.email)));
  // Someone who turned their alerts off doesn't want email from the site.
  const off = new Set(profiles.filter((p) => p.alert_frequency === "off").map((p) => norm(p.email)));
  const all = new Set<string>();
  for (const e of [...profiles.map((p) => p.email), ...subs.map((s) => s.email)]) {
    const n = norm(e);
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(n) && !skip.has(n) && !off.has(n)) all.add(n);
  }
  const list = [...all];
  notice(`${CAMPAIGN}: ${list.length} to send (${skip.size} skipped as opted out or already sent, ${off.size} with alerts off).`);

  let count = 0;
  for (let i = 0; i < list.length; i += 100) {
    const chunk = list.slice(i, i + 100);
    await resend("/emails/batch", chunk.map((to) => message(site, to, email.subject)));
    await db.from("email_sends").upsert(chunk.map((e) => ({ campaign: CAMPAIGN, email: e })), { onConflict: "campaign,email" });
    count += chunk.length;
  }
  notice(`${CAMPAIGN}: sent to ${count}.`);
}

main().catch(fail);
