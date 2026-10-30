import type { Metadata } from "next";
import Link from "next/link";
import { getCheckoutSession } from "@/lib/stripe";
import { markPaid } from "@/lib/sponsor";
import { SPONSOR_DAYS } from "@/lib/sponsor-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Thanks · Braun Board", robots: { index: false, follow: false } };

export default async function SponsorThanks({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  // Confirm with Stripe directly. The webhook does the same; whichever lands first wins.
  const session = session_id?.startsWith("cs_") ? await getCheckoutSession(session_id).catch(() => null) : null;
  const order = session ? await markPaid(session).catch(() => null) : null;
  const paid = session?.payment_status === "paid";

  return (
    <div className="mx-auto max-w-xl py-6">
      {paid ? (
        <>
          <p className="text-xs font-bold uppercase tracking-wide text-accent">Payment received</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Thanks{order ? `, ${order.contact_name.split(" ")[0]}` : ""}. You&apos;re booked.</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-2">
            {order ? (
              <>
                <span className="font-semibold text-ink">{order.job_title}</span> at {order.company} goes on the home page for {SPONSOR_DAYS} days
                {order.start_date ? ` starting ${order.start_date}` : " as soon as I've set it up, usually within one business day"}. It also goes out in a
                LinkedIn post and a newsletter send.
              </>
            ) : (
              <>Your job goes on the home page for {SPONSOR_DAYS} days, plus a LinkedIn post and a newsletter send.</>
            )}
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
            A receipt is on its way to {order?.email ?? "your inbox"}. I&apos;ll email you when each piece is live. Need to change something? Just reply to that email.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-bold tracking-tight">Hmm, I can&apos;t confirm that payment yet</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-2">
            If you just paid, give it a minute and refresh. Still stuck? Email{" "}
            <a href="mailto:josh@joshbraun.com" className="font-semibold text-ink underline underline-offset-2">josh@joshbraun.com</a> and I&apos;ll look it up.
          </p>
        </>
      )}
      <Link href="/" className="mt-8 inline-flex min-h-11 items-center rounded-lg border border-line-strong bg-surface px-5 text-sm font-semibold hover:bg-bg">
        Back to Braun Board
      </Link>
    </div>
  );
}
