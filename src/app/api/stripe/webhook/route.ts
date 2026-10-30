// Stripe calls this after checkout. Point a webhook at /api/stripe/webhook with
// checkout.session.completed and checkout.session.async_payment_succeeded.
import { NextResponse } from "next/server";
import { getCheckoutSession, verifyWebhook, type CheckoutSession } from "@/lib/stripe";
import { markPaid } from "@/lib/sponsor";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.text();
  const event = verifyWebhook(body, req.headers.get("stripe-signature"), process.env.STRIPE_WEBHOOK_SECRET ?? "");
  if (!event) return NextResponse.json({ error: "bad signature" }, { status: 400 });

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as CheckoutSession;
    if (session.metadata?.sponsored_job_id || session.client_reference_id) {
      try {
        // Re-read the session from Stripe rather than trusting the payload's shape.
        await markPaid(await getCheckoutSession(session.id));
      } catch (e) {
        console.error("[stripe] markPaid failed", e);
        return NextResponse.json({ error: "retry" }, { status: 500 }); // Stripe retries
      }
    }
  }
  return NextResponse.json({ received: true });
}
