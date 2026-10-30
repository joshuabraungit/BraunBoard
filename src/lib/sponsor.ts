// Sponsored job orders: save, upload logo, mark paid, send the emails. Server-only.
import "server-only";
import { adminClient } from "./supabase/admin";
import { adminEmails } from "./admin-emails";
import { sendEmail } from "./alerts/email";
import { formatPrice, SPONSOR_DAYS, type SponsorOrder } from "./sponsor-form";
import type { CheckoutSession } from "./stripe";

export const LOGO_BUCKET = "sponsor-logos";

export interface SponsoredJobRow extends SponsorOrder {
  id: string;
  created_at: string;
  status: "pending" | "paid" | "live" | "done" | "canceled";
  logo_path: string | null;
  amount_cents: number;
  stripe_session_id: string | null;
  paid_at: string | null;
}

export async function uploadLogo(orderId: string, file: File): Promise<string> {
  const ext = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/svg+xml": "svg" }[file.type] ?? "png";
  const path = `${orderId}.${ext}`;
  const { error } = await adminClient()
    .storage.from(LOGO_BUCKET)
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: true });
  if (error) throw error;
  return path;
}

export function logoUrl(path: string | null) {
  if (!path) return null;
  return adminClient().storage.from(LOGO_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function createOrder(order: SponsorOrder, amountCents: number): Promise<string> {
  const { data, error } = await adminClient()
    .from("sponsored_jobs")
    .insert({ ...order, amount_cents: amountCents })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function attachSession(orderId: string, sessionId: string, logoPath: string | null) {
  const { error } = await adminClient()
    .from("sponsored_jobs")
    .update({ stripe_session_id: sessionId, ...(logoPath ? { logo_path: logoPath } : {}) })
    .eq("id", orderId);
  if (error) throw error;
}

export async function getOrder(id: string): Promise<SponsoredJobRow | null> {
  const { data } = await adminClient().from("sponsored_jobs").select("*").eq("id", id).maybeSingle();
  return (data as SponsoredJobRow) ?? null;
}

/**
 * Marks the order paid if the session really is paid. Safe to call from both the
 * webhook and the thank-you page: only the first call flips the row and sends emails.
 */
export async function markPaid(session: CheckoutSession): Promise<SponsoredJobRow | null> {
  const orderId = session.client_reference_id ?? session.metadata?.sponsored_job_id;
  if (!orderId || session.payment_status !== "paid") return null;
  const { data, error } = await adminClient()
    .from("sponsored_jobs")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      stripe_session_id: session.id,
      stripe_payment_intent: session.payment_intent,
      ...(session.amount_total != null ? { amount_cents: session.amount_total } : {}),
    })
    .eq("id", orderId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();
  if (error) throw error;
  const row = data as SponsoredJobRow | null;
  if (row) await sendPaidEmails(row).catch((e) => console.error("[sponsor] email failed", e));
  return row ?? (await getOrder(orderId));
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const money = (n: number | null | undefined, cur: string) =>
  n == null ? "" : `${cur === "GBP" ? "£" : "$"}${n.toLocaleString("en-US")}${cur === "CAD" ? " CAD" : ""}`;

export function orderLines(o: SponsoredJobRow): [string, string][] {
  return [
    ["Company", o.company],
    ["Contact", `${o.contact_name} <${o.email}>`],
    ["Job", o.job_title],
    ["Link", o.job_url],
    ["Base", `${money(o.salary_min, o.currency)} to ${money(o.salary_max, o.currency)}`],
    ["OTE", o.ote_min ? `${money(o.ote_min, o.currency)} to ${money(o.ote_max, o.currency)}` : "Not given"],
    ["Where", [o.remote_type, o.location].filter(Boolean).join(" · ")],
    ["Start", o.start_date ?? "As soon as possible"],
    ["Logo", logoUrl(o.logo_path) ?? "None uploaded"],
    ["Paid", formatPrice(o.amount_cents)],
    ["Notes", o.notes ?? ""],
  ];
}

function wrap(title: string, body: string) {
  return `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:#faf8f5;padding:24px">
  <table width="100%" style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:10px;padding:24px">
  <tr><td><div style="font-size:13px;color:#888">Braun Board</div><h1 style="font-size:20px;margin:6px 0 12px">${esc(title)}</h1>${body}</td></tr>
  </table></body></html>`;
}

export function renderOwnerNotice(o: SponsoredJobRow, siteUrl: string) {
  const subject = `New sponsored job: ${o.job_title} at ${o.company}`;
  const rows = orderLines(o)
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#888;vertical-align:top">${k}</td><td style="padding:4px 0">${esc(v)}</td></tr>`)
    .join("");
  const html = wrap(subject, `<table style="font-size:14px">${rows}</table>
    <p style="font-size:14px;color:#555;margin-top:12px"><b>Description</b><br>${esc(o.description).replace(/\n/g, "<br>")}</p>
    <p style="margin-top:16px"><a href="${siteUrl}/admin/sponsored" style="color:#111;font-weight:600">Open in Admin →</a></p>`);
  const text = `${subject}\n\n${orderLines(o).map(([k, v]) => `${k}: ${v}`).join("\n")}\n\nDescription:\n${o.description}\n\n${siteUrl}/admin/sponsored`;
  return { subject, html, text };
}

export function renderCustomerReceipt(o: SponsoredJobRow) {
  const subject = `You're booked: ${o.job_title} on Braun Board`;
  const when = o.start_date ? `starting ${o.start_date}` : "as soon as I've set it up (usually within one business day)";
  const lines = [
    `Hi ${o.contact_name.split(" ")[0]},`,
    `Thanks for sponsoring ${o.job_title} at ${o.company}. Payment came through.`,
    `Here's what happens next: the job goes on the Braun Board home page for ${SPONSOR_DAYS} days ${when}. It also goes out in a LinkedIn post and a newsletter send. I'll email you when each one is live.`,
    `If anything in your details needs a fix, just reply to this email.`,
    `Josh`,
  ];
  const html = wrap(subject, lines.map((l) => `<p style="font-size:15px;line-height:1.5;color:#222">${esc(l)}</p>`).join(""));
  return { subject, html, text: lines.join("\n\n") };
}

async function sendPaidEmails(o: SponsoredJobRow) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://braunboard.com";
  const owner = adminEmails()[0];
  await Promise.all([
    owner ? sendEmail(owner, renderOwnerNotice(o, site), { replyTo: o.email }) : null,
    sendEmail(o.email, renderCustomerReceipt(o), { replyTo: owner }),
  ]);
}
