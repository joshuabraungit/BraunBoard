// Sponsored job orders: save, upload logo, mark paid, send the emails. Server-only.
import "server-only";
import { adminClient } from "./supabase/admin";
import { adminEmails } from "./admin-emails";
import { sendEmail } from "./alerts/email";
import { formatPrice, liveWindow, MAX_LIVE_SPONSORS, payLine, SPONSOR_DAYS, type SponsorOrder } from "./sponsor-form";
import { getCheckoutSession, getInvoiceLinks, isSettled, type CheckoutSession, type Invoice } from "./stripe";

export const LOGO_BUCKET = "sponsor-logos";

export interface SponsoredJobRow extends SponsorOrder {
  id: string;
  created_at: string;
  status: "pending" | "paid" | "live" | "done" | "canceled";
  logo_path: string | null;
  amount_cents: number;
  stripe_session_id: string | null;
  paid_at: string | null;
  live_at: string | null;
  ends_at: string | null;
  views: number;
  apply_clicks: number;
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
  if (!orderId || !isSettled(session)) return null;
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
  if (row) await sendPaidEmails(row, session.invoice).catch((e) => console.error("[sponsor] email failed", e));
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

export function renderOwnerNotice(o: SponsoredJobRow, siteUrl: string, invoice: Invoice | null = null) {
  const subject = `New sponsored job: ${o.job_title} at ${o.company}`;
  const rows = orderLines(o)
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#888;vertical-align:top">${k}</td><td style="padding:4px 0">${esc(v)}</td></tr>`)
    .join("");
  const html = wrap(subject, `<table style="font-size:14px">${rows}</table>
    <p style="font-size:14px;color:#555;margin-top:12px"><b>Description</b><br>${esc(o.description).replace(/\n/g, "<br>")}</p>
    <p style="margin-top:16px"><a href="${siteUrl}/admin/sponsored" style="color:#111;font-weight:600">Open in Admin →</a>${
      invoice?.hosted_invoice_url ? ` &nbsp;·&nbsp; <a href="${esc(invoice.hosted_invoice_url)}" style="color:#111">Invoice${invoice.number ? ` ${esc(invoice.number)}` : ""}</a>` : ""
    }</p>`);
  const text = `${subject}\n\n${orderLines(o).map(([k, v]) => `${k}: ${v}`).join("\n")}\n\nDescription:\n${o.description}\n\n${siteUrl}/admin/sponsored${invoice?.hosted_invoice_url ? `\nInvoice: ${invoice.hosted_invoice_url}` : ""}`;
  return { subject, html, text };
}

const niceDate = (ymd: string) =>
  new Date(`${ymd}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "America/New_York" });

/** The autoresponse a buyer gets the moment they pay. Josh's voice: short lines, no hype. */
export function renderCustomerReceipt(o: SponsoredJobRow, invoice: Invoice | null = null) {
  const subject = `Got it. Thanks for sponsoring ${o.job_title}.`;
  const where = [o.remote_type, o.location].filter(Boolean).join(" · ");
  const summary = [`${o.company} · ${o.job_title}`, payLine(o), where, o.job_url];
  const para = [
    `Hi ${o.contact_name.trim().split(/\s+/)[0]},`,
    `Your payment came through.`,
    `Here's what happens next.`,
    `I read every sponsored job before it goes up. Usually within one business day.`,
    `If it doesn't qualify, you get a full refund.`,
    `Once it's approved, it sits at the top of the Braun Board home page for ${SPONSOR_DAYS} days.${o.start_date ? ` Starting ${niceDate(o.start_date)}, like you asked.` : ""}`,
    `It also goes out in a LinkedIn post and a newsletter send.`,
    `You'll get an email from me when it's live, with a link to the page sellers see.`,
  ];
  const after = [`Something off? Just reply. It comes straight to me.`, `Josh`];
  const invoiceLine = invoice?.hosted_invoice_url ? `Your invoice${invoice.number ? ` (${invoice.number})` : ""}: ${invoice.hosted_invoice_url}` : null;

  const p = (t: string) => `<p style="font-size:15px;line-height:1.5;color:#222;margin:0 0 14px">${esc(t)}</p>`;
  const html = wrap(
    subject,
    para.map(p).join("") +
      `<p style="font-size:15px;line-height:1.5;color:#222;margin:0 0 6px">Here's what you sent:</p>
       <div style="font-size:14px;line-height:1.6;color:#333;background:#faf8f5;border:1px solid #eee;border-radius:8px;padding:12px 14px;margin:0 0 14px">${summary
         .map((l, i) => (i === summary.length - 1 ? `<a href="${esc(l)}" style="color:#333">${esc(l)}</a>` : esc(l)))
         .join("<br>")}</div>` +
      (invoice?.hosted_invoice_url
        ? `<p style="font-size:15px;line-height:1.5;color:#222;margin:0 0 14px"><a href="${esc(invoice.hosted_invoice_url)}" style="color:#111;font-weight:600">View or download your invoice${invoice.number ? ` (${esc(invoice.number)})` : ""} →</a></p>`
        : `<p style="font-size:14px;line-height:1.5;color:#555;margin:0 0 14px">Need an invoice? Reply and I'll send one.</p>`) +
      after.map(p).join(""),
  );
  const text = [
    ...para,
    `Here's what you sent:\n${summary.join("\n")}`,
    invoiceLine ?? `Need an invoice? Reply and I'll send one.`,
    ...after,
  ].join("\n\n");
  return { subject, html, text };
}

async function sendPaidEmails(o: SponsoredJobRow, invoiceId?: string | null) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://braunboard.com";
  const owner = adminEmails()[0];
  const invoice = await getInvoiceLinks(invoiceId);
  await Promise.all([
    owner ? sendEmail(owner, renderOwnerNotice(o, site, invoice), { replyTo: o.email }) : null,
    sendEmail(o.email, renderCustomerReceipt(o, invoice), { replyTo: owner }),
  ]);
}

/** Sponsors showing right now, newest first. Never throws: the home page must load regardless. */
export async function listRunningSponsors(): Promise<SponsoredJobRow[]> {
  try {
    const now = new Date().toISOString();
    const { data } = await adminClient()
      .from("sponsored_jobs")
      .select("*")
      .eq("status", "live")
      .lte("live_at", now)
      .gt("ends_at", now)
      .order("live_at", { ascending: false })
      .limit(MAX_LIVE_SPONSORS);
    return (data ?? []) as SponsoredJobRow[];
  } catch {
    return [];
  }
}

export async function bump(id: string, what: "view" | "apply") {
  await adminClient().rpc("sponsored_job_bump", { sid: id, what }).then(
    () => undefined,
    (e: unknown) => console.error("[sponsor] bump failed", e),
  );
}

/** Josh's "Mark live": sets the 30-day window and tells the buyer where to find it. */
export async function markLive(id: string): Promise<SponsoredJobRow> {
  const order = await getOrder(id);
  if (!order) throw new Error("Order not found");
  if (order.status !== "paid") throw new Error(`Can't go live from ${order.status}`);
  const { data: booked } = await adminClient()
    .from("sponsored_jobs")
    .select("live_at, ends_at")
    .eq("status", "live")
    .gt("ends_at", new Date().toISOString());
  const { data, error } = await adminClient()
    .from("sponsored_jobs")
    .update({ status: "live", ...liveWindow(order.start_date, new Date(), (booked ?? []) as { live_at: string; ends_at: string }[]) })
    .eq("id", id)
    .eq("status", "paid")
    .select("*")
    .single();
  if (error) throw error;
  const row = data as SponsoredJobRow;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://braunboard.com";
  await sendEmail(row.email, renderLiveEmail(row, site), { replyTo: adminEmails()[0] }).catch((e) =>
    console.error("[sponsor] live email failed", e),
  );
  return row;
}

const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "America/New_York" });

export function renderLiveEmail(o: SponsoredJobRow, siteUrl: string) {
  const startsLater = o.live_at && new Date(o.live_at) > new Date(Date.now() + 60_000);
  const subject = startsLater ? `${o.job_title} goes live on Braun Board ${day(o.live_at!)}` : `${o.job_title} is live on Braun Board`;
  const link = `${siteUrl}/sponsored/${o.id}`;
  const lines = [
    `Hi ${o.contact_name.split(" ")[0]},`,
    startsLater
      ? `${o.job_title} at ${o.company} is approved. It goes on the Braun Board home page on ${day(o.live_at!)} and stays there through ${day(o.ends_at!)}.`
      : `${o.job_title} at ${o.company} is now featured at the top of the Braun Board home page. It runs through ${day(o.ends_at!)}.`,
    `Here's the job page sellers land on: ${link}`,
    `The LinkedIn post and newsletter send are next. I'll let you know when those go out.`,
    `Josh`,
  ];
  const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:#faf8f5;padding:24px">
  <table width="100%" style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:10px;padding:24px"><tr><td>
  <div style="font-size:13px;color:#888">Braun Board</div><h1 style="font-size:20px;margin:6px 0 12px">${esc(subject)}</h1>
  ${lines.map((l) => `<p style="font-size:15px;line-height:1.5;color:#222">${esc(l).replace(esc(link), `<a href="${link}" style="color:#111;font-weight:600">${esc(link)}</a>`)}</p>`).join("")}
  <p style="font-size:14px;color:#555">${esc(payLine(o))}</p>
  </td></tr></table></body></html>`;
  return { subject, html, text: lines.join("\n\n") };
}

/** Admin "Resend receipt": sends the buyer the paid autoresponse again, with a fresh invoice link. */
export async function resendReceipt(id: string): Promise<{ to: string; invoice: boolean }> {
  const o = await getOrder(id);
  if (!o) throw new Error("Order not found");
  if (!["paid", "live", "done"].includes(o.status)) throw new Error("Only paid orders have a receipt.");
  const session = o.stripe_session_id ? await getCheckoutSession(o.stripe_session_id).catch(() => null) : null;
  const invoice = await getInvoiceLinks(session?.invoice, 1);
  const sent = await sendEmail(o.email, renderCustomerReceipt(o, invoice), { replyTo: adminEmails()[0] });
  if (!sent) throw new Error("Email isn't set up on the site (RESEND_API_KEY), so nothing was sent.");
  return { to: o.email, invoice: !!invoice };
}
