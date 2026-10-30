"use server";
// Saves the order, uploads the logo, then hands off to Stripe Checkout.

import { redirect } from "next/navigation";
import { checkLogo, parseSponsorForm, sponsorPriceCents, SPONSOR_DAYS, type FieldErrors } from "@/lib/sponsor-form";
import { attachSession, createOrder, uploadLogo } from "@/lib/sponsor";
import { createCheckoutSession } from "@/lib/stripe";

export type SponsorState = { errors: FieldErrors; values: Record<string, string> };

export async function startCheckout(_prev: SponsorState, fd: FormData): Promise<SponsorState> {
  const values = Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;

  // Honeypot: bots fill every field.
  if (values.website) return { errors: { form: "Something went wrong. Try again?" }, values };

  const price = sponsorPriceCents();
  if (!price) return { errors: { form: "Checkout isn't switched on yet. Email josh@joshbraun.com and I'll sort it out." }, values };

  const parsed = parseSponsorForm(fd);
  const logo = fd.get("logo");
  const logoError = checkLogo(logo);
  if (!parsed.ok || logoError) {
    return { errors: { ...(parsed.ok ? {} : parsed.errors), ...(logoError ? { logo: logoError } : {}) }, values };
  }

  let url: string | null;
  try {
    const o = parsed.order;
    const orderId = await createOrder(o, price);
    const logoPath = logo instanceof File && logo.size > 0 ? await uploadLogo(orderId, logo) : null;
    const session = await createCheckoutSession({
      orderId,
      email: o.email,
      amountCents: price,
      productName: "Braun Board sponsored job",
      description: `${o.job_title} at ${o.company}: ${SPONSOR_DAYS} days featured on the home page, a LinkedIn post and a newsletter send.`,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://braunboard.com",
    });
    await attachSession(orderId, session.id, logoPath);
    url = session.url;
  } catch (e) {
    console.error("[sponsor] checkout failed", e);
    return { errors: { form: "Couldn't start checkout. Nothing was charged. Try again in a minute?" }, values };
  }
  if (!url) return { errors: { form: "Couldn't start checkout. Nothing was charged. Try again in a minute?" }, values };
  redirect(url);
}
