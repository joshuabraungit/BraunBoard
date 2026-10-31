// Renewals: the "7 days left" email and its signed renew link. No server-only import,
// so the hourly runner (a plain script) can send the reminders.
import { createHmac, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "./alerts/email";
import { adminEmails } from "./admin-emails";
import { formatPrice, sponsorPriceCents, SPONSOR_DAYS } from "./sponsor-form";

export const RENEW_REMINDER_DAYS = 7;

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

type ReminderRow = { id: string; job_title: string; company: string; contact_name: string; email: string; ends_at: string };

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Josh's voice. Low pressure: congrats if they've hired, one link if they haven't, and what happens either way. */
export function renderRenewReminder(o: ReminderRow, siteUrl: string, priceCents: number | null) {
  const ends = renewDay(o.ends_at);
  const link = renewUrl(siteUrl, o.id);
  const price = priceCents ? formatPrice(priceCents) : null;
  const subject = `${o.job_title} has a week left on Braun Board`;
  const before = [
    `Hi ${o.contact_name.trim().split(/\s+/)[0]},`,
    `Quick heads up. ${o.job_title} comes off the Braun Board home page on ${ends}.`,
    `If you've found your person, congrats. You don't need to do anything.`,
    `Still looking? You can keep it up for another ${SPONSOR_DAYS} days. Same ad, and it picks up the day the current run ends${price ? `. ${price}, one payment` : ""}.`,
  ];
  const after = [
    `If you don't renew, here's what happens. On ${ends}, it comes off the home page. The job page stays up with a note that the feature ended, so old links still work. Nothing renews on its own, and you won't be charged again.`,
    `Want to change the ad first? Just reply.`,
    `Josh`,
  ];
  const p = (t: string) => `<p style="font-size:15px;line-height:1.5;color:#222;margin:0 0 14px">${esc(t)}</p>`;
  const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:#faf8f5;padding:24px">
  <table width="100%" style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:10px;padding:24px"><tr><td>
  <div style="font-size:13px;color:#888">Braun Board</div><h1 style="font-size:20px;margin:6px 0 12px">${esc(subject)}</h1>
  ${before.map(p).join("")}
  <p style="margin:0 0 18px"><a href="${esc(link)}" style="display:inline-block;background:#16140f;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:11px 18px;border-radius:8px">Renew for ${SPONSOR_DAYS} more days →</a></p>
  ${after.map(p).join("")}
  </td></tr></table></body></html>`;
  const text = [...before, `Renew for ${SPONSOR_DAYS} more days: ${link}`, ...after].join("\n\n");
  return { subject, html, text };
}

/**
 * Hourly runner: emails each live sponsor once, about a week before their run ends.
 * Skips anyone who has already renewed. Claims the row first so a rerun never double-sends.
 */
export async function sendRenewalReminders(db: SupabaseClient, now = new Date()): Promise<number> {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://braunboard.com";
  const soon = new Date(now.getTime() + RENEW_REMINDER_DAYS * 86_400_000).toISOString();
  const { data, error } = await db
    .from("sponsored_jobs")
    .select("id, job_title, company, contact_name, email, ends_at")
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
    await sendEmail(o.email, renderRenewReminder(o, site, sponsorPriceCents()), { replyTo: adminEmails()[0] });
    sent++;
  }
  return sent;
}
