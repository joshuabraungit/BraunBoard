import type { Metadata } from "next";
import Link from "next/link";
import { formatPrice, sponsorPriceCents, SPONSOR_DAYS } from "@/lib/sponsor-form";
import { AttainmentBadge } from "@/components/SponsoredCard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  alternates: { canonical: "/employers" },
  title: "For employers: sponsor a sales job · Braun Board",
  description:
    "Job ads started needing a translator. Braun Board explains your sales job in plain English, with pay up front. Josh rewrites it, you approve it. One price, once.",
};

// Josh's voice: one idea per line, plain words, a little levity. No em dashes.
const LETTER: (string | "BADGE")[] = [
  "Picture a great seller looking for their next job.",
  "They're excited. Then they open the job ad.",
  "\u201cWe're seeking a results-oriented hunter to evangelize our disruptive solution in a fast-paced environment.\u201d",
  "Somewhere along the way, job ads started needing a translator.",
  "Everyone's a rock star. Every company's a rocket ship. Apparently, we're starting a band in space.",
  "Meanwhile, what sellers care about is missing.",
  "What will I sell? What's the base? The OTE? How many reps actually earn it? Will I get leads, or build my own list between demos?",
  "\u201cUncapped earning potential\u201d sounds lovely. So does winning the lottery. I'd still like to know the odds.",
  "When sellers can't picture the job, they don't apply. Even the perfect ones.",
  "So I started Braun Board. A job board for salespeople, written for humans.",
  "I explain, in plain English, what you sell, who buys it, and what the seller will actually do all day.",
  "Pay is up front. Companies that share how many reps hit OTE get a badge.",
  "BADGE",
  "A job ad should help a seller decide whether to talk. Not require a decoder ring.",
  "There are good sales jobs out there.",
];

const GET = [
  ["I rewrite your job in plain English.", "What you sell, who buys it, and what the seller will actually do all day. You approve every word."],
  [`${SPONSOR_DAYS} days at the top of the home page.`, "It's the first thing sellers see."],
  ["A LinkedIn post.", "I share your job with my audience of sales folks."],
  ["A newsletter send.", "Your job lands in the inbox of sellers who asked for jobs."],
  ["Your own job page.", "Pay, what you sell, and an Apply button that goes straight to your posting."],
  ["The OTE badge, if you want it.", "Share how many reps hit OTE and it shows on your listing."],
] as const;

const STEPS = [
  ["Paste in your job.", "Plus a few details: pay, location, and when you want it to go live. About five minutes. Then pay."],
  ["I read it.", "Usually within one business day. If it's not a sales role, or base pay is missing, I'll tell you why and refund you."],
  ["I rewrite it.", "The job, and what you sell, both in plain English. I'll send it over. Change anything you want. Nothing goes up without your OK."],
  ["It goes live.", "On the date you picked. I'll email you the link."],
  ["I share it.", "A LinkedIn post and a newsletter send."],
  [`${SPONSOR_DAYS === 30 ? "Thirty" : SPONSOR_DAYS} days later, it comes down.`, "No renewals. No surprise charges."],
] as const;

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-2xl font-bold tracking-tight">{children}</h2>;
}

function Cta({ price, big }: { price: string; big?: boolean }) {
  return (
    <Link
      href="/sponsor"
      className={`inline-flex items-center rounded-lg bg-ink font-semibold text-white hover:opacity-90 ${big ? "min-h-14 px-7 text-base" : "min-h-12 px-6 text-[15px]"}`}
    >
      Sponsor a job{price ? ` · ${price}` : ""} →
    </Link>
  );
}

export default function EmployersPage() {
  const cents = sponsorPriceCents();
  const price = cents ? formatPrice(cents) : "";

  return (
    <div className="mx-auto max-w-2xl">
      {/* The letter, on paper: a sheet on top of two slightly turned sheets. */}
      <p className="text-xs font-bold uppercase tracking-wide text-accent">For employers</p>
      <div className="relative mt-5 sm:mt-8">
        <div aria-hidden="true" className="absolute inset-0 -translate-x-1 translate-y-1 rounded-sm md:translate-x-0 md:translate-y-0 md:-rotate-[1.2deg] border border-line bg-white shadow-[0_1px_3px_rgba(22,20,15,0.06)]" />
        <div aria-hidden="true" className="absolute inset-0 translate-x-1 translate-y-2 rounded-sm md:translate-x-0 md:translate-y-0 md:rotate-[0.8deg] border border-line bg-white shadow-[0_1px_3px_rgba(22,20,15,0.06)]" />
        <article className="relative rounded-sm border border-line bg-white px-6 py-10 shadow-[0_8px_30px_rgba(22,20,15,0.08)] sm:px-14 sm:py-16">
          <h1 className="text-[19px] leading-relaxed text-ink sm:text-[21px]">
            Hey there,
            <br />
            <br />
            I&apos;m Josh, founder of Braun Board.
          </h1>
          <div className="mt-6 space-y-6 text-[19px] leading-relaxed text-ink sm:text-[21px]">
            {LETTER.map((line) =>
              line === "BADGE" ? (
                <p key={line}>
                  <span className="text-base">
                    <AttainmentBadge pct={70} />
                  </span>
                </p>
              ) : (
                <p key={line}>{line}</p>
              ),
            )}
            <p>Let&apos;s make yours easier to understand.</p>
          </div>
          <p className="mt-10 font-serif text-2xl italic text-ink">Josh</p>
        </article>
      </div>
      <div className="mt-10 text-center">
        <Cta price={price} big />
      </div>

      {/* What you get */}
      <section className="mt-16">
        <H2>What you get</H2>
        <ul className="mt-5 space-y-4 text-[17px] leading-relaxed">
          {GET.map(([title, rest]) => (
            <li key={title}>
              <span className="font-semibold text-ink">{title}</span> <span className="text-ink-2">{rest}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-[17px] leading-relaxed text-ink-2">
          One thing you won&apos;t get: a Braun Read. Every other job here gets my honest take. Sponsored jobs don&apos;t. I don&apos;t grade what I&apos;m paid
          to show. That&apos;s why sellers trust the board you&apos;re on.
        </p>
      </section>

      {/* What it costs */}
      <section className="mt-16 rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <H2>What it costs</H2>
        <p className="mt-4 text-3xl font-bold tracking-tight">{price || "One price"}. Once.</p>
        <div className="mt-4 space-y-3 text-[17px] leading-relaxed text-ink-2">
          <p>No subscription. No &ldquo;contact sales for pricing.&rdquo; (I&apos;d know. I teach sales.)</p>
          <p>
            <span className="font-semibold text-ink">Two rules:</span> it has to be a sales role, and it has to show base pay.
          </p>
          <p>If it doesn&apos;t qualify, you get your money back.</p>
        </div>
        <div className="mt-6">
          <Cta price={price} />
        </div>
        <p className="mt-3 text-sm text-ink-3">
          Questions first? Email me:{" "}
          <a href="mailto:josh@joshbraun.com" className="font-semibold text-ink underline underline-offset-2">
            josh@joshbraun.com
          </a>
        </p>
      </section>

      {/* How it works */}
      <section className="mt-16">
        <H2>How it works</H2>
        <ol className="mt-5 space-y-5">
          {STEPS.map(([title, rest], i) => (
            <li key={title} className="flex gap-4">
              <span className="mt-0.5 font-serif text-2xl font-bold leading-none text-accent">{i + 1}</span>
              <div className="text-[17px] leading-relaxed">
                <p className="font-semibold text-ink">{title}</p>
                <p className="mt-0.5 text-ink-2">{rest}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* How you'll know it worked */}
      <section className="mt-16">
        <H2>How you&apos;ll know it worked</H2>
        <div className="mt-5 space-y-4 text-lg leading-relaxed text-ink">
          <p>You won&apos;t get a dashboard.</p>
          <p>No impressions. No click-through rates. No charts going up and to the right.</p>
          <p>Here&apos;s the test.</p>
          <p>People you&apos;d want to hire apply.</p>
          <p>If they do, it worked.</p>
          <p>If they don&apos;t, it didn&apos;t.</p>
          <p className="font-semibold">That&apos;s the only number that matters.</p>
        </div>
      </section>

      {/* Last call */}
      <section className="mt-16 rounded-2xl border border-line bg-surface p-6 text-center sm:p-8">
        <p className="text-2xl font-bold tracking-tight">Ready when you are.</p>
        <p className="mt-2 text-[17px] text-ink-2">Paste in your job. I&apos;ll take it from there.</p>
        <div className="mt-6">
          <Cta price={price} big />
        </div>
      </section>
    </div>
  );
}
