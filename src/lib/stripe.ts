// Tiny Stripe client over the REST API, so there's no SDK to keep current.
// Server-only: reads STRIPE_SECRET_KEY.
import { createHmac, timingSafeEqual } from "node:crypto";

// The account's default API version is from 2018, older than the Checkout fields used here.
// Pin a current version so every call (and the webhook, set to match in Stripe) speaks the same shape.
export const STRIPE_VERSION = "2026-09-30.endive";

export interface CheckoutSession {
  id: string;
  url: string | null;
  payment_status: "paid" | "unpaid" | "no_payment_required";
  status: "open" | "complete" | "expired";
  amount_total: number | null;
  payment_intent: string | null;
  client_reference_id: string | null;
  /** Invoice id when invoice_creation is on (set once checkout completes). */
  invoice?: string | null;
  customer_details?: { email?: string | null; name?: string | null } | null;
  metadata?: Record<string, string>;
}

/** Flattens nested params into Stripe's form encoding: line_items[0][price_data][currency]=usd */
export function formEncode(obj: Record<string, unknown>, prefix = ""): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === "object") out.push(...formEncode(v as Record<string, unknown>, key));
    else out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
  }
  return out;
}

async function stripe<T>(path: string, init: { method: "GET" | "POST"; body?: Record<string, unknown> }): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": STRIPE_VERSION,
    },
    body: init.body ? formEncode(init.body).join("&") : undefined,
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Stripe ${res.status}: ${json?.error?.message ?? "request failed"}`);
  return json as T;
}

export function createCheckoutSession(p: {
  orderId: string;
  email: string;
  amountCents: number;
  productName: string;
  description: string;
  siteUrl: string;
}) {
  return stripe<CheckoutSession>("checkout/sessions", {
    method: "POST",
    body: {
      mode: "payment",
      client_reference_id: p.orderId,
      customer_email: p.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: p.amountCents,
            product_data: { name: p.productName, description: p.description },
          },
        },
      ],
      allow_promotion_codes: "true",
      invoice_creation: { enabled: "true" },
      metadata: { sponsored_job_id: p.orderId },
      payment_intent_data: { metadata: { sponsored_job_id: p.orderId } },
      success_url: `${p.siteUrl}/sponsor/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${p.siteUrl}/sponsor?canceled=1&order=${p.orderId}`,
    },
  });
}

export interface Invoice {
  id: string;
  number: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
}

/** The buyer's invoice links. Stripe can take a moment to finalize, so retry briefly. Never throws. */
export async function getInvoiceLinks(id: string | null | undefined, tries = 3): Promise<Invoice | null> {
  if (!id) return null;
  for (let i = 0; i < tries; i++) {
    try {
      const inv = await stripe<Invoice>(`invoices/${encodeURIComponent(id)}`, { method: "GET" });
      if (inv.hosted_invoice_url) return inv;
    } catch (e) {
      console.error("[stripe] invoice lookup failed", e);
    }
    if (i < tries - 1) await new Promise((r) => setTimeout(r, 1500));
  }
  return null;
}

/** Paid, or fully covered by a promo code (Stripe reports that as "no_payment_required"). */
export const isSettled = (s: Pick<CheckoutSession, "status" | "payment_status">) =>
  s.status === "complete" && (s.payment_status === "paid" || s.payment_status === "no_payment_required");

export const getCheckoutSession = (id: string) => stripe<CheckoutSession>(`checkout/sessions/${encodeURIComponent(id)}`, { method: "GET" });

/**
 * Checks a Stripe-Signature header (t=...,v1=...) against the raw body.
 * Returns the parsed event, or null if the signature is wrong or too old.
 */
export function verifyWebhook(
  payload: string,
  header: string | null,
  secret: string,
  nowSec = Math.floor(Date.now() / 1000),
  toleranceSec = 300,
): { id: string; type: string; data: { object: unknown } } | null {
  if (!header || !secret) return null;
  const parts = header.split(",").map((p) => p.split("=") as [string, string]);
  const t = Number(parts.find(([k]) => k === "t")?.[1]);
  const sigs = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!t || !sigs.length || Math.abs(nowSec - t) > toleranceSec) return null;
  const expected = Buffer.from(createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex"));
  const ok = sigs.some((s) => {
    const b = Buffer.from(s);
    return b.length === expected.length && timingSafeEqual(b, expected);
  });
  if (!ok) return null;
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}
