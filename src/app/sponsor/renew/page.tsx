import type { Metadata } from "next";
import Link from "next/link";
import { getOrder, paidRenewalOf } from "@/lib/sponsor";
import { readRenewToken, renewDay } from "@/lib/sponsor-renew";
import { formatPrice, sponsorPriceCents, SPONSOR_DAYS } from "@/lib/sponsor-form";
import { startRenewal } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Renew your sponsored job · Braun Board", robots: { index: false, follow: false } };

const Email = () => (
  <a href="mailto:josh@joshbraun.com" className="font-semibold text-ink underline underline-offset-2">
    josh@joshbraun.com
  </a>
);

export default async function RenewPage({ searchParams }: { searchParams: Promise<{ t?: string; error?: string }> }) {
  const { t, error } = await searchParams;
  const id = readRenewToken(t);
  const order = id ? await getOrder(id) : null;
  const renewal = order ? await paidRenewalOf(order.id) : null;
  const cents = sponsorPriceCents();

  if (!order || !["live", "done"].includes(order.status)) {
    return (
      <div className="mx-auto max-w-xl py-6">
        <h1 className="text-3xl font-bold tracking-tight">Hmm, that renew link didn&apos;t work</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-2">
          Email me at <Email /> and I&apos;ll sort it out.
        </p>
      </div>
    );
  }

  if (renewal) {
    return (
      <div className="mx-auto max-w-xl py-6">
        <p className="text-xs font-bold uppercase tracking-wide text-accent">Already renewed</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">You&apos;re all set.</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-2">
          <span className="font-semibold text-ink">{order.job_title}</span> is renewed
          {renewal.ends_at ? ` through ${renewDay(renewal.ends_at)}` : ""}. Nothing else to do.
        </p>
      </div>
    );
  }

  const ended = !!order.ends_at && new Date(order.ends_at) <= new Date();
  return (
    <div className="mx-auto max-w-xl py-6">
      <p className="text-xs font-bold uppercase tracking-wide text-accent">Renew</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">
        Keep {order.job_title} up for another {SPONSOR_DAYS} days?
      </h1>
      <div className="mt-4 space-y-3 text-[16px] leading-relaxed text-ink-2">
        <p>
          {order.ends_at && !ended
            ? `It picks up the day the current run ends, ${renewDay(order.ends_at)}, so there's no gap.`
            : "It goes back to the top of the home page as soon as you pay."}{" "}
          Same ad.
        </p>
        <p>You get the same package as before: {SPONSOR_DAYS} more days at the top of the home page, another LinkedIn post and another newsletter send.</p>
        <p>{cents ? `${formatPrice(cents)}, one payment.` : "One payment."} Nothing renews on its own.</p>
        <p>
          Want to change the ad first? Email me at <Email /> before you renew.
        </p>
      </div>
      {error === "checkout" && (
        <p className="mt-5 rounded-lg bg-red-soft px-4 py-3 text-sm text-red">Couldn&apos;t start checkout. Nothing was charged. Try again in a minute?</p>
      )}
      <form action={startRenewal} className="mt-6">
        <input type="hidden" name="t" value={t} />
        <button className="inline-flex min-h-12 items-center rounded-lg bg-ink px-6 text-[15px] font-semibold text-white hover:opacity-90">
          Renew for {SPONSOR_DAYS} more days{cents ? ` · ${formatPrice(cents)}` : ""} →
        </button>
      </form>
      <Link href="/" className="mt-8 inline-block text-sm text-ink-3 underline underline-offset-2">
        No thanks
      </Link>
    </div>
  );
}
