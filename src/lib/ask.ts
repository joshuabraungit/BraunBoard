// "Ask Josh": someone sends a question or an offer from the site. It's saved, then emailed to Josh
// with Reply-To set to the sender, so hitting Reply in his inbox answers them directly.

import { createHash } from "node:crypto";
import { adminClient } from "./supabase/admin";
import { isSupabaseConfigured } from "./supabase/server";
import { sendEmail } from "./alerts/email";
import { formatComp } from "./format";

export type AskStatus = "ok" | "invalid" | "short" | "slow" | "error";

export interface AskInput {
  email: string;
  name?: string;
  message: string;
  offer?: string;
  jobSlug?: string;
  source?: string;
}

export interface AskJob {
  id: string;
  slug: string;
  title_raw: string;
  company_name: string;
  salary_min: number | null;
  salary_max: number | null;
  ote_min: number | null;
  ote_max: number | null;
  currency?: string | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const MAX_MESSAGE = 3000;
export const MAX_OFFER = 2000;
// Per sender, so one person (or a bot) can't flood the inbox.
const PER_HOUR = 3;
const PER_DAY = 6;

/** Clean and check what was typed. Returns null when it can't be sent. */
export function cleanAsk(raw: AskInput): { ok: true; value: Required<Omit<AskInput, "jobSlug">> & { jobSlug: string } } | { ok: false; status: AskStatus } {
  const email = raw.email.trim().toLowerCase();
  const message = raw.message.trim();
  if (!EMAIL_RE.test(email) || email.length > 200) return { ok: false, status: "invalid" };
  if (message.length < 10) return { ok: false, status: "short" };
  return {
    ok: true,
    value: {
      email,
      name: (raw.name ?? "").trim().slice(0, 100),
      message: message.slice(0, MAX_MESSAGE),
      offer: (raw.offer ?? "").trim().slice(0, MAX_OFFER),
      jobSlug: (raw.jobSlug ?? "").trim().slice(0, 200),
      source: (raw.source ?? "site").trim().slice(0, 40),
    },
  };
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const para = (s: string) => esc(s).replace(/\n/g, "<br>");

/** The email Josh gets. */
export function renderAsk(a: { email: string; name: string; message: string; offer: string }, job: AskJob | null, siteUrl: string) {
  const who = a.name ? `${a.name} (${a.email})` : a.email;
  const about = job ? `${job.title_raw} at ${job.company_name}` : null;
  const subject = about ? `Ask Josh: ${about}` : `Ask Josh: a question from ${a.name || a.email}`;
  const jobUrl = job ? `${siteUrl}/jobs/${job.slug}` : null;
  const pay = job ? formatComp(job) : "";
  const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:#faf8f5;padding:24px">
  <table width="100%" style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:10px;padding:24px">
  <tr><td><div style="font-size:13px;color:#888">Braun Board · Ask Josh</div>
  <p style="margin:8px 0 0;font-size:14px;color:#555">From ${esc(who)}. Hit reply to answer them.</p></td></tr>
  ${job ? `<tr><td style="padding-top:16px"><div style="font-size:13px;color:#888">About this job</div>
  <a href="${jobUrl}" style="color:#111;font-weight:600">${esc(about!)}</a>${pay ? `<div style="color:#555;font-size:14px">${esc(pay)}</div>` : ""}</td></tr>` : ""}
  <tr><td style="padding-top:16px"><div style="font-size:13px;color:#888">Question</div><div style="font-size:15px;line-height:1.5">${para(a.message)}</div></td></tr>
  ${a.offer ? `<tr><td style="padding-top:16px"><div style="font-size:13px;color:#888">Offer details</div><div style="font-size:15px;line-height:1.5">${para(a.offer)}</div></td></tr>` : ""}
  </table></body></html>`;
  const text = [`From ${who}. Hit reply to answer them.`, about ? `\nAbout: ${about}${pay ? ` (${pay})` : ""}\n${jobUrl}` : "", `\nQuestion:\n${a.message}`, a.offer ? `\nOffer details:\n${a.offer}` : ""]
    .filter(Boolean)
    .join("\n");
  return { subject, html, text };
}

const ipHash = (ip: string) => createHash("sha256").update(`ask:${ip}`).digest("hex").slice(0, 32);

/** Save, rate-limit and email. Never throws: returns a status for the form to show. */
export async function submitAsk(input: AskInput, ctx: { ip: string; userId: string | null; getJob: (slug: string) => Promise<AskJob | null> }): Promise<AskStatus> {
  const c = cleanAsk(input);
  if (!c.ok) return c.status;
  const a = c.value;
  const job = a.jobSlug ? await ctx.getJob(a.jobSlug).catch(() => null) : null;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.braunboard.com";
  const to = process.env.ASK_TO ?? "josh@joshbraun.com";
  // Same verified sending address as alerts, with a friendlier name.
  const addr = /<([^>]+)>/.exec(process.env.ALERTS_FROM ?? "")?.[1] ?? "alerts@braunboard.com";
  const from = `Ask Josh via Braun Board <${addr}>`;

  if (!isSupabaseConfigured()) {
    await sendEmail(to, renderAsk(a, job, siteUrl), { from, replyTo: a.email });
    return "ok";
  }

  const db = adminClient();
  const ip = ipHash(ctx.ip || "unknown");
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  const dayAgo = new Date(Date.now() - 86400_000).toISOString();
  const [byIp, byEmail] = await Promise.all([
    db.from("ask_messages").select("id", { count: "exact", head: true }).eq("ip_hash", ip).gte("created_at", hourAgo),
    db.from("ask_messages").select("id", { count: "exact", head: true }).eq("email", a.email).gte("created_at", dayAgo),
  ]);
  if ((byIp.count ?? 0) >= PER_HOUR || (byEmail.count ?? 0) >= PER_DAY) return "slow";

  const { data: row, error } = await db
    .from("ask_messages")
    .insert({
      email: a.email,
      name: a.name || null,
      message: a.message,
      offer: a.offer || null,
      job_id: job?.id ?? null,
      job_slug: job?.slug ?? null,
      user_id: ctx.userId,
      source: a.source,
      ip_hash: ip,
    })
    .select("id")
    .single();
  if (error) {
    console.error("ask insert failed", error.message);
    return "error";
  }
  try {
    await sendEmail(to, renderAsk(a, job, siteUrl), { from, replyTo: a.email });
    await db.from("ask_messages").update({ emailed: true }).eq("id", row.id);
    return "ok";
  } catch (e) {
    // Saved but not emailed: keep the error so nothing gets lost.
    await db.from("ask_messages").update({ error: (e as Error).message.slice(0, 500) }).eq("id", row.id);
    console.error("ask email failed", (e as Error).message);
    return "error";
  }
}
