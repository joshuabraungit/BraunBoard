import type { Metadata } from "next";
import { SponsorForm } from "./SponsorForm";
import { formatPrice, sponsorPriceCents, SPONSOR_DAYS } from "@/lib/sponsor-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  alternates: { canonical: "/sponsor" },
  title: "Sponsor a sales job · Braun Board",
  description: `Put your sales opening in front of B2B sellers: ${SPONSOR_DAYS} days featured on the Braun Board home page, a LinkedIn post and a newsletter send.`,
};

const WHAT_YOU_GET = [
  [`${SPONSOR_DAYS} days on the home page`, "Featured at the top of Braun Board, where sellers start their search."],
  ["A LinkedIn post", "I share the job with my audience of sales folks."],
  ["A newsletter send", "The job goes out to people who asked for sales jobs in their inbox."],
] as const;

export default async function SponsorPage({ searchParams }: { searchParams: Promise<{ canceled?: string }> }) {
  const { canceled } = await searchParams;
  const cents = sponsorPriceCents();
  const price = cents ? formatPrice(cents) : "";

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-xs font-bold uppercase tracking-wide text-accent">For hiring managers</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Sponsor a sales job</h1>
      <p className="mt-2 text-lg text-ink-2">Get your opening in front of sellers who are actually looking.</p>

      <div className="mt-6 rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-bold">What you get</h2>
          {price && (
            <p className="font-serif text-2xl font-bold text-accent">
              {price} <span className="font-sans text-sm font-normal text-ink-3">one time</span>
            </p>
          )}
        </div>
        <ul className="mt-3 space-y-2.5 text-[15px]">
          {WHAT_YOU_GET.map(([title, rest]) => (
            <li key={title} className="flex gap-2.5">
              <span aria-hidden="true" className="mt-0.5 font-bold text-accent">✓</span>
              <span>
                <span className="font-semibold">{title}.</span> <span className="text-ink-2">{rest}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-ink-2">
          Two rules: it has to be a sales role, and it has to show base pay.
        </p>
      </div>

      <div className="mt-10">
        {cents ? (
          <SponsorForm price={price} canceled={canceled === "1"} />
        ) : (
          <p className="rounded-lg bg-amber-soft px-4 py-3 text-sm text-amber">
            Online checkout isn&apos;t open yet. Email <a href="mailto:josh@joshbraun.com" className="font-semibold underline">josh@joshbraun.com</a> and I&apos;ll set you up.
          </p>
        )}
      </div>
    </div>
  );
}
