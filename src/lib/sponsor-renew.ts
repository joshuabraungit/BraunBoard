// Sponsor emails: the "5 days left" results check-in, the end-of-run thank-you, and the signed renew link. No server-only import,
// so the hourly runner (a plain script) can send the reminders.
import { createHmac, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "./alerts/email";
import { adminEmails } from "./admin-emails";

/** Same as resultsLink in sponsor.ts, which is server-only and can't load in the hourly script. */
const resultsLink = (o: { review_token: string | null }) =>
  o.review_token ? `${(process.env.NEXT_PUBLIC_SITE_URL ?? "https://braunboard.com").replace(/\/$/, "")}/results/${o.review_token}` : null;

export const RENEW_REMINDER_DAYS = 5;

const secret = () => process.env.ALERTS_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const sig = (id: string) => createHmac("sha256", secret()).update(`sponsor-renew:${id}`).digest("base64url").slice(0, 22);

/** The link carries a signed code, so only the sponsor's email can open their renew page. */
export const renewToken = (id: string) => `${id}.${sig(id)}`;

export function readRenewToken(token: string | null | undefined): string | null {
  if (!token || !secret()) return null;
  const [id, s] = token.split(".");
  if (!id || !s || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const want = Buffer.from(sig(id));
  const got = Buffer.from(s);
  return want.length === got.length && timingSafeEqual(want, got) ? id : null;
}

export const renewUrl = (siteUrl: string, id: string) => `${siteUrl}/sponsor/renew?t=${renewToken(id)}`;

export const renewDay = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "America/New_York" });

type ReminderRow = { id: string; job_title: string; company: string; contact_name: string; email: string; ends_at: string; review_token: string | null };

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Josh's voice. The one wrap-up email, 5 days before a run ends: results, how the hire went, feedback, and a free Tongue Tied deck. No ask for money. */
export function renderRenewReminder(o: ReminderRow) {
  const ends = renewDay(o.ends_at);
  const link = resultsLink(o);
  const subject = `How'd the ${o.job_title} search go?`;
  const before = [
    `Hi ${o.contact_name.trim().split(/\s+/)[0]},`,
    `Quick heads up. ${o.job_title} comes off the Braun Board home page on ${ends}. The job page stays up after that, so any links you shared still work. Thanks for trusting me with it.`,
    link ? `Here's how it did. Views, apply clicks and where people came from:` : `Want to see how it did? Just reply and I'll send you the numbers.`,
  ];
  const after = [
    `So, the big question. Did you find your person? Or at least have a few interviews where you thought, "OK, this one gets it"? I can see clicks on Apply. After that, I'm like a parent waiting up at 2am with no texts.`,
    `And if you have a minute, I'd be grateful for your honest take. Braun Board is still new, and I'm figuring it out as I go. What worked? What didn't? Anything you'd change? Just reply. Even one line helps.`,
    `Either way, I'd like to send you a deck of Tongue Tied, my objection flashcards. Each card has an objection sellers hear all the time on one side, and a way to handle it on the other. Keep it, or pass it to someone on your sales team. Just reply with a name and mailing address.`,
    `Josh`,
  ];
  const p = (t: string) => `<p style="font-size:15px;line-height:1.5;color:#222;margin:0 0 14px">${esc(t)}</p>`;
  const button = link
    ? `<p style="margin:0 0 18px"><a href="${esc(link)}" style="display:inline-block;background:#16140f;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:11px 18px;border-radius:8px">See your results →</a></p>`
    : "";
  const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:#faf8f5;padding:24px">
  <table width="100%" style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:10px;padding:24px"><tr><td>
  <div style="font-size:13px;color:#888">Braun Board</div><h1 style="font-size:20px;margin:6px 0 12px">${esc(subject)}</h1>
  ${before.map(p).join("")}
  ${button}
  ${after.map(p).join("")}
  </td></tr></table></body></html>`;
  const text = [...before, ...(link ? [`Your results: ${link}`] : []), ...after].join("\n\n");
  return { subject, html, text };
}

/**
 * Hourly runner: emails each live sponsor once, about 5 days before their run ends.
 * Skips anyone who has already renewed. Claims the row first so a rerun never double-sends.
 */
export async function sendRenewalReminders(db: SupabaseClient, now = new Date()): Promise<number> {
  const soon = new Date(now.getTime() + RENEW_REMINDER_DAYS * 86_400_000).toISOString();
  const { data, error } = await db
    .from("sponsored_jobs")
    .select("id, job_title, company, contact_name, email, ends_at, review_token")
    .eq("status", "live")
    .is("renewal_reminded_at", null)
    .gt("ends_at", now.toISOString())
    .lte("ends_at", soon);
  if (error) throw error;
  let sent = 0;
  for (const o of (data ?? []) as ReminderRow[]) {
    const { data: renewed } = await db.from("sponsored_jobs").select("id").eq("renewal_of", o.id).in("status", ["paid", "live", "done"]).limit(1);
    const { data: claimed } = await db
      .from("sponsored_jobs")
      .update({ renewal_reminded_at: now.toISOString() })
      .eq("id", o.id)
      .is("renewal_reminded_at", null)
      .select("id");
    if (!claimed?.length || renewed?.length) continue;
    await sendEmail(o.email, renderRenewReminder(o), { replyTo: adminEmails()[0] });
    sent++;
  }
  return sent;
}

type ThanksRow = { id: string; job_title: string; contact_name: string; email: string };

/** The day a run ends (and they didn't renew): a real thank-you, a free Tongue Tied deck, and a feedback ask. No pitch. */
export function renderThanksEmail(o: ThanksRow) {
  const subject = `Thanks for sponsoring ${o.job_title}`;
  const lines = [
    `Hi ${o.contact_name.trim().split(/\s+/)[0]},`,
    `${o.job_title} came off the Braun Board home page today. Thanks for trusting me with it.`,
    `So, the big question. Did you find your person? Or at least have a few interviews where you thought, "OK, this one gets it"? I've been checking your results page like it's a fantasy football score, so I'd really like to know how it ended.`,
    `Either way, I'd like to send you a deck of Tongue Tied, my objection flashcards. Each card has an objection sellers hear all the time on one side, and a way to handle it on the other. Keep it, or pass it to someone on your sales team. Just reply with a name and mailing address.`,
    `And if you have a minute, I'd be grateful for your honest take. Braun Board is still new, and I'm figuring it out as I go. What worked? What didn't? Anything you'd change? Just reply. Even one line helps.`,
    `The job page stays up, so any links you shared still work. Thanks again.`,
    `Josh`,
  ];
  const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:#faf8f5;padding:24px">
  <table width="100%" style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:10px;padding:24px"><tr><td>
  <div style="font-size:13px;color:#888">Braun Board</div><h1 style="font-size:20px;margin:6px 0 12px">${esc(subject)}</h1>
  ${lines.map((t) => `<p style="font-size:15px;line-height:1.5;color:#222;margin:0 0 14px">${esc(t)}</p>`).join("")}
  </td></tr></table></body></html>`;
  return { subject, html, text: lines.join("\n\n") };
}

/**
 * Hourly runner: thanks each sponsor once, the day their run ends. Skips anyone who renewed
 * (their run keeps going) and anything that ended more than 3 days ago (no surprise emails from the past).
 */
export async function sendEndOfRunThanks(db: SupabaseClient, now = new Date()): Promise<number> {
  const since = new Date(now.getTime() - 3 * 86_400_000).toISOString();
  const { data, error } = await db
    .from("sponsored_jobs")
    .select("id, job_title, contact_name, email")
    .in("status", ["live", "done"])
    .is("thanks_sent_at", null)
    .lte("ends_at", now.toISOString())
    .gt("ends_at", since);
  if (error) throw error;
  let sent = 0;
  for (const o of (data ?? []) as ThanksRow[]) {
    const { data: renewed } = await db.from("sponsored_jobs").select("id").eq("renewal_of", o.id).in("status", ["paid", "live", "done"]).limit(1);
    const { data: claimed } = await db
      .from("sponsored_jobs")
      .update({ thanks_sent_at: now.toISOString() })
      .eq("id", o.id)
      .is("thanks_sent_at", null)
      .select("id");
    if (!claimed?.length || renewed?.length) continue;
    await sendEmail(o.email, renderThanksEmail(o), { replyTo: adminEmails()[0] });
    sent++;
  }
  return sent;
}
