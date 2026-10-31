// Sponsored job orders: save, upload logo, mark paid, send the emails. Server-only.
import "server-only";
import { adminClient } from "./supabase/admin";
import { adminEmails } from "./admin-emails";
import { sendEmail } from "./alerts/email";
import { formatPrice, liveWindow, MAX_LIVE_SPONSORS, payLine, SPONSOR_DAYS, type SponsorEdit, type SponsorOrder } from "./sponsor-form";
import { getCheckoutSession, getInvoiceLinks, isSettled, refundPayment, type CheckoutSession, type Invoice } from "./stripe";
import { adHash, adReview, REVIEW_NOTE_MAX, reviewSummary, verdictLine, type AssetReview, type ReviewFields, type Verdict } from "./sponsor-review";

export const LOGO_BUCKET = "sponsor-logos";
export const VIDEO_BUCKET = "sponsor-videos";

export interface SponsoredJobRow extends SponsorOrder, Partial<Omit<ReviewFields, keyof SponsorOrder>> {
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
  stripe_payment_intent?: string | null;
  refunded_at?: string | null;
  stripe_refund_id?: string | null;
  cancel_reason?: string | null;
  renewal_of?: string | null;
  review_token?: string;
  review_opened_at?: string | null;
  review_sent_at?: string | null;
}

/** The row with every review field filled in (missing columns read as null). */
export const reviewFields = (o: SponsoredJobRow): ReviewFields => ({
  job_title: o.job_title,
  description: o.description,
  product_short: o.product_short ?? null,
  video_path: o.video_path ?? null,
  video_review: o.video_review ?? null,
  video_note: o.video_note ?? null,
  video_reviewed_path: o.video_reviewed_path ?? null,
  ad_review: o.ad_review ?? null,
  ad_note: o.ad_note ?? null,
  ad_reviewed_hash: o.ad_reviewed_hash ?? null,
});

/** Josh's edits from Admin. Only the words sellers read; pay and dates stay as the buyer sent them. */
export async function updateSponsorCopy(id: string, edit: SponsorEdit) {
  const { error } = await adminClient().from("sponsored_jobs").update(edit).eq("id", id);
  if (error) throw error;
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
  let row = data as SponsoredJobRow | null;
  if (row?.renewal_of) {
    // Renewals skip the rewrite and approval: same ad, picks up when the current run ends.
    row = await scheduleRenewal(row);
    await sendRenewalEmails(row, session.invoice).catch((e) => console.error("[sponsor] renewal email failed", e));
  } else if (row) {
    await sendPaidEmails(row, session.invoice).catch((e) => console.error("[sponsor] email failed", e));
  }
  return row ?? (await getOrder(orderId));
}

/** Copies a sponsor's ad into a new pending order for another run. Returns the new order id. */
export async function createRenewal(oldId: string): Promise<{ id: string; order: SponsoredJobRow }> {
  const old = await getOrder(oldId);
  if (!old || !["live", "done"].includes(old.status)) throw new Error("Only a sponsorship that ran can be renewed.");
  const price = Number(process.env.SPONSOR_PRICE_CENTS);
  const keep = [
    "company", "contact_name", "email", "job_title", "job_url", "description", "salary_min", "salary_max", "ote_min", "ote_max",
    "currency", "location", "remote_type", "logo_path", "notes", "ote_attainment_pct", "product_short", "product_story",
  ] as const;
  const copy = Object.fromEntries(keep.map((k) => [k, old[k as keyof SponsoredJobRow] ?? null]));
  const { data, error } = await adminClient()
    .from("sponsored_jobs")
    .insert({ ...copy, amount_cents: Number.isInteger(price) && price >= 100 ? price : old.amount_cents, renewal_of: old.id })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id as string, order: old };
}

/** The renewal of `oldId` that's already paid for, if any. */
export async function paidRenewalOf(oldId: string): Promise<SponsoredJobRow | null> {
  const { data } = await adminClient()
    .from("sponsored_jobs")
    .select("*")
    .eq("renewal_of", oldId)
    .in("status", ["paid", "live", "done"])
    .limit(1)
    .maybeSingle();
  return (data as SponsoredJobRow) ?? null;
}

async function scheduleRenewal(row: SponsoredJobRow): Promise<SponsoredJobRow> {
  const old = row.renewal_of ? await getOrder(row.renewal_of) : null;
  const now = new Date();
  const from = old?.ends_at && new Date(old.ends_at) > now ? new Date(old.ends_at) : now;
  const { data: booked } = await adminClient()
    .from("sponsored_jobs")
    .select("live_at, ends_at")
    .eq("status", "live")
    .gt("ends_at", from.toISOString());
  const { data, error } = await adminClient()
    .from("sponsored_jobs")
    .update({ status: "live", ...liveWindow(null, from, (booked ?? []) as { live_at: string; ends_at: string }[]) })
    .eq("id", row.id)
    .eq("status", "paid")
    .select("*")
    .single();
  if (error) throw error;
  return data as SponsoredJobRow;
}

export function renderRenewalReceipt(o: SponsoredJobRow, invoice: Invoice | null = null) {
  const subject = `You're renewed. ${o.job_title} stays up through ${day(o.ends_at!)}.`;
  const lines = [
    `Hi ${o.contact_name.trim().split(/\s+/)[0]},`,
    `Thanks for renewing.`,
    `${o.job_title} stays at the top of the Braun Board home page for another ${SPONSOR_DAYS} days, through ${day(o.ends_at!)}. It also goes out in a new LinkedIn post and another newsletter send. Nothing else to do on your end.`,
    `Want to change the ad? Just reply.`,
    `Josh`,
  ];
  const p = (t: string) => `<p style="font-size:15px;line-height:1.5;color:#222;margin:0 0 14px">${esc(t)}</p>`;
  const inv = invoice?.hosted_invoice_url
    ? `<p style="font-size:15px;line-height:1.5;color:#222;margin:0 0 14px"><a href="${esc(invoice.hosted_invoice_url)}" style="color:#111;font-weight:600">View or download your invoice${invoice.number ? ` (${esc(invoice.number)})` : ""} →</a></p>`
    : "";
  const html = wrap(subject, lines.slice(0, 3).map(p).join("") + inv + lines.slice(3).map(p).join(""));
  const text = [...lines.slice(0, 3), ...(invoice?.hosted_invoice_url ? [`Your invoice: ${invoice.hosted_invoice_url}`] : []), ...lines.slice(3)].join("\n\n");
  return { subject, html, text };
}

async function sendRenewalEmails(o: SponsoredJobRow, invoiceId?: string | null) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://braunboard.com";
  const owner = adminEmails()[0];
  const invoice = await getInvoiceLinks(invoiceId);
  const notice = renderOwnerNotice(o, site, invoice);
  notice.subject = `Renewed: ${o.job_title} at ${o.company} (through ${day(o.ends_at!)}). Owes a new LinkedIn post + newsletter send.`;
  notice.html = notice.html.replace("New sponsored job:", "Renewed:");
  notice.text = notice.text.replace("New sponsored job:", "Renewed:");
  await Promise.all([
    owner ? sendEmail(owner, notice, { replyTo: o.email }) : null,
    sendEmail(o.email, renderRenewalReceipt(o, invoice), { replyTo: owner }),
  ]);
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
    ["Logo", logoUrl(o.logo_path) ?? "None uploaded"],
    ["Paid", formatPrice(o.amount_cents)],
    ["Hit OTE", o.ote_attainment_pct != null ? `${o.ote_attainment_pct}% of ramped reps last year` : "Not given"],
    ["What they sell", [o.product_short, o.product_story].filter(Boolean).join(" · ") || "Not given"],
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


/** The autoresponse a buyer gets the moment they pay. Josh's voice: short lines, no hype. */
export function renderCustomerReceipt(o: SponsoredJobRow, invoice: Invoice | null = null) {
  const subject = `Got it. Thanks for sponsoring ${o.job_title}.`;
  const where = [o.remote_type, o.location].filter(Boolean).join(" · ");
  const summary = [`${o.company} · ${o.job_title}`, payLine(o), where, o.job_url];
  const para = [
    `Hi ${o.contact_name.trim().split(/\s+/)[0]},`,
    `Your payment came through.`,
    `Here's what happens next.`,
    `I'll read your job and rewrite it in plain English. Usually within one business day.`,
    `You'll get the rewrite to approve. Change anything you like. Nothing goes up until you say yes.`,
    `Once you approve it, it sits at the top of the Braun Board home page for ${SPONSOR_DAYS} days. It also goes out in a LinkedIn post and a newsletter send.`,
    `If your job doesn't qualify, you get a full refund.`,
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
  // Nothing goes up until the client approves the job ad. The video is a bonus: it shows on the job page only once approved.
  if (adReview(reviewFields(order)).status !== "up")
    throw new Error(`${order.contact_name.split(" ")[0]} hasn't approved the job ad yet. Mark live unlocks once it has a thumbs up.`);
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

/** Can be canceled with a refund: paid and not yet on the page (approved-but-scheduled counts). */
export const canRefund = (o: Pick<SponsoredJobRow, "status" | "live_at">, now = new Date()) =>
  o.status === "paid" || (o.status === "live" && !!o.live_at && new Date(o.live_at) > now);

/**
 * Admin "Cancel and refund": refunds the full payment in Stripe, marks the order canceled,
 * and tells the buyer. Refund first, so an order is never marked canceled without its money back.
 */
export async function cancelAndRefund(id: string, reason: string | null): Promise<{ to: string; refunded: number }> {
  const o = await getOrder(id);
  if (!o) throw new Error("Order not found");
  if (o.status === "canceled") throw new Error("Already canceled.");
  if (!canRefund(o)) throw new Error("This one is already on the home page. Take it down first, then refund in Stripe if you want to.");

  let refundId: string | null = null;
  let refunded = 0;
  if (o.amount_cents > 0) {
    const pi = o.stripe_payment_intent ?? (o.stripe_session_id ? (await getCheckoutSession(o.stripe_session_id)).payment_intent : null);
    if (!pi) throw new Error("Couldn't find the payment in Stripe. Refund it there by hand.");
    const r = await refundPayment(pi, o.id);
    refundId = r.id;
    refunded = r.amount;
  }

  const why = reason?.trim().slice(0, 500) || null;
  const { error } = await adminClient()
    .from("sponsored_jobs")
    .update({ status: "canceled", refunded_at: new Date().toISOString(), stripe_refund_id: refundId, cancel_reason: why })
    .eq("id", id);
  if (error) throw error;

  await sendEmail(o.email, renderRefundEmail(o, refunded, why), { replyTo: adminEmails()[0] }).catch((e) =>
    console.error("[sponsor] refund email failed", e),
  );
  return { to: o.email, refunded };
}

export function renderRefundEmail(o: SponsoredJobRow, refundedCents: number, reason: string | null) {
  const subject = `About your Braun Board sponsorship: ${o.job_title}`;
  const lines = [
    `Hi ${o.contact_name.trim().split(/\s+/)[0]},`,
    `Thanks for sponsoring ${o.job_title} at ${o.company}.`,
    `I can't run this one on Braun Board.${reason ? ` ${reason}` : ""}`,
    refundedCents > 0
      ? `I've refunded the full ${formatPrice(refundedCents)}. It usually shows up on your card in 5 to 10 business days.`
      : `Nothing was charged, so there's nothing to refund.`,
    `Questions? Just reply. It comes straight to me.`,
    `Josh`,
  ];
  const html = wrap(subject, lines.map((l) => `<p style="font-size:15px;line-height:1.5;color:#222;margin:0 0 14px">${esc(l)}</p>`).join(""));
  return { subject, html, text: lines.join("\n\n") };
}

// ---------------------------------------------------------------------------
// Client review: the private /review/<token> link Josh sends a sponsor.

export function videoUrl(path: string | null | undefined) {
  if (!path) return null;
  return adminClient().storage.from(VIDEO_BUCKET).getPublicUrl(path).data.publicUrl;
}

export const isReviewToken = (t: string) => /^[a-f0-9]{64}$/.test(t);

export function reviewLink(o: Pick<SponsoredJobRow, "review_token">) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://braunboard.com";
  return o.review_token ? `${site.replace(/\/$/, "")}/review/${o.review_token}` : null;
}

/** The order behind a review link. Only paid or live orders can be reviewed. */
export async function getOrderByReviewToken(token: string): Promise<SponsoredJobRow | null> {
  if (!isReviewToken(token)) return null;
  const { data } = await adminClient().from("sponsored_jobs").select("*").eq("review_token", token).maybeSingle();
  const row = (data as SponsoredJobRow) ?? null;
  return row && ["paid", "live"].includes(row.status) ? row : null;
}

/** First open only, so Admin can say "Opened Oct 31". Never throws. */
export async function markReviewOpened(id: string) {
  await adminClient()
    .from("sponsored_jobs")
    .update({ review_opened_at: new Date().toISOString() })
    .eq("id", id)
    .is("review_opened_at", null)
    .then(
      () => undefined,
      (e: unknown) => console.error("[sponsor] review open stamp failed", e),
    );
}

export interface ReviewInput {
  ad?: { verdict: Verdict; note: string; hash: string };
  video?: { verdict: Verdict; note: string; path: string };
}

export class StaleReviewError extends Error {}

/**
 * Saves the client's thumbs. Each verdict carries the version it was about (the ad's hash, the
 * video's file path); if Josh changed it in the meantime, nothing is saved and the client reloads.
 * Emails Josh what she said.
 */
export async function submitClientReview(token: string, input: ReviewInput): Promise<{ row: SponsoredJobRow; line: string }> {
  const o = await getOrderByReviewToken(token);
  if (!o) throw new Error("This review link isn't active anymore.");
  if (!input.ad && !input.video) throw new Error("Nothing to send yet.");
  if (input.ad && input.ad.hash !== adHash(reviewFields(o))) throw new StaleReviewError("Josh just updated the job ad. Reload to see the latest version.");
  if (input.video && input.video.path !== o.video_path) throw new StaleReviewError("Josh just swapped in a new video. Reload to see it.");
  const note = (s: string) => s.trim().slice(0, REVIEW_NOTE_MAX) || null;

  const now = new Date().toISOString();
  const update: Record<string, unknown> = { review_sent_at: now };
  if (input.ad) Object.assign(update, { ad_review: input.ad.verdict, ad_note: input.ad.verdict === "down" ? note(input.ad.note) : null, ad_reviewed_hash: input.ad.hash });
  if (input.video)
    Object.assign(update, { video_review: input.video.verdict, video_note: input.video.verdict === "down" ? note(input.video.note) : null, video_reviewed_path: input.video.path });

  const { data, error } = await adminClient().from("sponsored_jobs").update(update).eq("id", o.id).select("*").single();
  if (error) throw error;
  const row = data as SponsoredJobRow;
  const line = verdictLine([input.video?.verdict, input.ad?.verdict].filter((v): v is Verdict => !!v));

  const owner = adminEmails()[0];
  if (owner) {
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://braunboard.com";
    await sendEmail(owner, renderReviewNotice(row, input, site), { replyTo: row.email }).catch((e) => console.error("[sponsor] review email failed", e));
  }
  return { row, line };
}

const verdictText = (a: AssetReview | null, who: string) =>
  !a
    ? null
    : a.status === "up"
      ? "Approved"
      : a.status === "down"
        ? `Changes requested${a.note ? `: "${a.note}"` : ""}`
        : a.status === "changed"
          ? `Changed since ${who}'s last look, waiting on ${who}`
          : `Waiting on ${who}`;

/** The email Josh gets the moment a sponsor hits "Send to Josh". */
export function renderReviewNotice(o: SponsoredJobRow, input: ReviewInput, siteUrl: string) {
  const first = o.contact_name.trim().split(/\s+/)[0];
  const sum = reviewSummary(reviewFields(o));
  const sent = [input.video?.verdict, input.ad?.verdict].filter(Boolean) as Verdict[];
  const ups = sent.filter((v) => v === "up").length;
  const subject = sum.allApproved
    ? `${first} approved everything for ${o.company}`
    : ups === 0
      ? `${first} asked for changes on ${o.company}`
      : `${first} approved ${ups} of ${sent.length} for ${o.company}`;
  const rows: [string, string][] = [
    ...(sum.video ? [["Video", verdictText(sum.video, first)!] as [string, string]] : []),
    ["Job ad", verdictText(sum.ad, first)!],
  ];
  const next = sum.allApproved
    ? "Everything's approved. Mark it live in Admin when you're ready."
    : sum.ad.status === "up" && !sum.changesRequested
      ? "The job ad is approved, so you can mark it live. The video shows up on the job page once it's approved too."
    : sum.changesRequested
      ? `Make the changes in Admin. The review link shows the new version, and ${first} gets to look again.`
      : "";
  const html = wrap(
    subject,
    `<table style="font-size:15px;margin:0 0 14px">${rows
      .map(([k, v]) => `<tr><td style="padding:4px 14px 4px 0;color:#888;vertical-align:top">${k}</td><td style="padding:4px 0">${esc(v)}</td></tr>`)
      .join("")}</table>
    ${next ? `<p style="font-size:15px;line-height:1.5;color:#222;margin:0 0 14px">${esc(next)}</p>` : ""}
    <p style="margin-top:16px"><a href="${siteUrl}/admin/sponsored" style="color:#111;font-weight:600">Open in Admin →</a></p>`,
  );
  const text = [subject, rows.map(([k, v]) => `${k}: ${v}`).join("\n"), next, `${siteUrl}/admin/sponsored`].filter(Boolean).join("\n\n");
  return { subject, html, text };
}

/** Admin video upload, step 1: a one-time URL the browser uploads straight to (skips the 4.5MB request cap). */
export async function createVideoUpload(id: string, contentType: string) {
  const ext = { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" }[contentType];
  if (!ext) throw new Error("Upload an MP4, WebM or MOV file.");
  const path = `${id}/${Date.now()}.${ext}`;
  const { data, error } = await adminClient().storage.from(VIDEO_BUCKET).createSignedUploadUrl(path);
  if (error) throw error;
  return { path, token: data.token };
}

/** Step 2: point the order at the new file. A new file means the client reviews it again. */
export async function attachVideo(id: string, path: string | null) {
  if (path !== null && !path.startsWith(`${id}/`)) throw new Error("That video belongs to another order.");
  const old = await getOrder(id);
  const { error } = await adminClient().from("sponsored_jobs").update({ video_path: path }).eq("id", id);
  if (error) throw error;
  if (old?.video_path && old.video_path !== path) {
    await adminClient().storage.from(VIDEO_BUCKET).remove([old.video_path]).catch(() => undefined);
  }
}
