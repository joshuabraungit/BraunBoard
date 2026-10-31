"use server";
// Renew button: copies the ad into a new order and hands off to Stripe Checkout.

import { redirect } from "next/navigation";
import { createRenewal, paidRenewalOf, attachSession } from "@/lib/sponsor";
import { readRenewToken, renewUrl } from "@/lib/sponsor-renew";
import { sponsorPriceCents, SPONSOR_DAYS } from "@/lib/sponsor-form";
import { createCheckoutSession } from "@/lib/stripe";

export async function startRenewal(fd: FormData) {
  const token = String(fd.get("t") ?? "");
  const id = readRenewToken(token);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://braunboard.com";
  if (!id) redirect("/sponsor/renew?error=link");
  if (await paidRenewalOf(id)) redirect(`/sponsor/renew?t=${encodeURIComponent(token)}`);
  const price = sponsorPriceCents();
  if (!price) redirect(`/sponsor/renew?t=${encodeURIComponent(token)}&error=checkout`);

  let url: string | null = null;
  try {
    const { id: newId, order } = await createRenewal(id);
    const session = await createCheckoutSession({
      orderId: newId,
      email: order.email,
      amountCents: price,
      productName: "Braun Board sponsored job renewal",
      description: `${order.job_title} at ${order.company}: ${SPONSOR_DAYS} more days featured on the home page, a LinkedIn post and a newsletter send.`,
      siteUrl: site,
      cancelUrl: renewUrl(site, id),
    });
    await attachSession(newId, session.id, null);
    url = session.url;
  } catch (e) {
    console.error("[sponsor] renewal checkout failed", e);
  }
  redirect(url ?? `/sponsor/renew?t=${encodeURIComponent(token)}&error=checkout`);
}
