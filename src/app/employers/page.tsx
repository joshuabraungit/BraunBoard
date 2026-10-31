import type { Metadata } from "next";
import Link from "next/link";
import { formatPrice, sponsorPriceCents, SPONSOR_DAYS } from "@/lib/sponsor-form";
import { AttainmentBadge } from "@/components/SponsoredCard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  alternates: { canonical: "/employers" },
  title: "For employers: sponsor a sales job · Braun Board",
  description:
    "Hiring a salesperson? Josh rewrites your job ad in plain English, pins it to Braun Board for 30 days, and shares it on LinkedIn and in his newsletter. $750, one payment.",
};

// Josh's voice: plain English, short paragraphs, warm, a little funny. No hype, no em dashes,
// and no promises about hiring results. Only claims the product actually backs up.
const LETTER = [
  "I'm Josh, founder of Braun Board.",
  "Picture a great seller looking for their next job. They're excited. Then they open the job ad.",
  "“We're seeking a results-oriented hunter to evangelize our disruptive solution in a fast-paced environment.”",
  "Everyone's a rock star. Every company's a rocket ship. Apparently, we're starting a band in space.",
  "Meanwhile, the questions sellers actually have go unanswered. What will I sell? What's the base? The OTE? How many reps earn it? Where do the leads come from?",
  "When sellers can't picture the job, some move on. Including people you'd want to meet.",
  "So I started Braun Board. A job board for salespeople, written for humans.",
] as const;

const GET = [
  ["A plain-English rewrite.", "What you sell, who buys it, and what the job looks like day to day. You approve it before it goes up."],
  [`${SPONSOR_DAYS} days pinned to the top of the home page.`, "Above the newest jobs, where sellers start."],
  ["One LinkedIn post.", "I share your job with the people who follow me there."],
  ["One newsletter send.", "Your job goes out in my newsletter."],
  ["Your own job page.", "Pay, what you sell, and an Apply button that goes to your application."],
  ["An optional OTE badge.", "More on that below."],
] as const;

const STEPS = [
  ["Submit and pay.", "Paste in your job and add pay, location, and when you'd like it to start. About five minutes."],
  ["I review it.", "Usually within one business day. If it isn't a sales role or base pay is missing, you get a full refund."],
  ["I rewrite it. You approve it.", "I send you the plain-English version. Change anything you like. Nothing goes up until you say yes."],
  [
    "It goes live, and I share it.",
    "On your start date, or once you approve if that's later. Two jobs are featured at a time, so if both spots are taken, yours starts when one opens. Then the LinkedIn post and the newsletter send.",
  ],
  [`It ends after ${SPONSOR_DAYS} days.`, "No renewal. No surprise charge."],
] as const;

// Illustrative: the "before" is written for this page, not taken from a real posting.
const BEFORE =
  "As a mission-driven, insights-led organization, we empower public sector, nonprofit, and enterprise stakeholders to unlock actionable intelligence across diverse audience ecosystems. Leveraging a proprietary blend of quantitative and qualitative methodologies, we deliver end-to-end research solutions that drive evidence-based decision-making at scale.";
const AFTER = [
  "Picture a town deciding whether to build a new park.",
  "At the public meeting, three people want pickleball courts. Two want a playground. Dave wants a merry-go-round.",
  "But what about the thousands of residents who weren't there?",
  "You'll sell research that helps the town hear from them too: surveys to learn what people want, interviews to learn why. Then the town decides before it spends the money.",
  "You'll sell that same kind of research to nonprofits, governments, and businesses facing big decisions.",
];

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
      {/* The offer, up front */}
      <p className="text-xs font-bold uppercase tracking-wide text-accent">For employers</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Your job, in front of people who sell for a living.</h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-2">
        Hiring a salesperson? I&apos;ll rewrite your ad in plain English, pin it to Braun Board for {SPONSOR_DAYS} days, and share it on LinkedIn and in my newsletter.
      </p>
      <p className="mt-4 text-xl font-bold">{price || "One price"}. One payment.</p>
      <div className="mt-6">
        <Cta price={price} big />
      </div>

      {/* The letter */}
      <section className="mt-16 border-t border-line pt-12">
        <div className="space-y-5 text-lg leading-relaxed text-ink sm:text-[19px]">
          <p>Hey there,</p>
          {LETTER.map((line) => (
            <p key={line}>{line}</p>
          ))}
          <p>
            I explain, in plain English, what you sell, who buys it, and what the seller will do all day. Pay goes up front. Let&apos;s make your job easier to
            understand.
          </p>
        </div>
        <p className="mt-8 font-serif text-2xl italic text-ink">Josh</p>
      </section>

      {/* What you get */}
      <section className="mt-16">
        <H2>What {price || "it"} gets you</H2>
        <ul className="mt-5 space-y-4 text-[17px] leading-relaxed">
          {GET.map(([title, rest]) => (
            <li key={title} className="flex gap-3">
              <span aria-hidden="true" className="mt-0.5 font-bold text-accent">
                ✓
              </span>
              <span>
                <span className="font-semibold text-ink">{title}</span> <span className="text-ink-2">{rest}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-[15px] text-ink-3">That&apos;s the whole package. Same price for every job.</p>
      </section>

      {/* Before and after */}
      <section className="mt-16">
        <H2>What the rewrite looks like</H2>
        <p className="mt-2 text-[15px] text-ink-3">Illustrative example.</p>
        <div className="mt-5 rounded-2xl border border-line bg-bg p-6 sm:p-7">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-3">Before</p>
          <p className="mt-3 text-[16px] leading-relaxed text-ink-3">{BEFORE}</p>
        </div>
        <div className="mt-4 rounded-2xl border border-line bg-surface p-6 shadow-[0_8px_30px_rgba(22,20,15,0.06)] sm:p-7">
          <p className="text-xs font-bold uppercase tracking-wide text-accent">After</p>
          <p className="mt-3 text-xl font-bold tracking-tight">What you&apos;ll sell</p>
          <div className="mt-3 space-y-3 text-[17px] leading-relaxed text-ink">
            {AFTER.map((t) => (
              <p key={t}>{t}</p>
            ))}
          </div>
        </div>
      </section>

      {/* OTE badge */}
      <section className="mt-16">
        <H2>The OTE badge</H2>
        <div className="mt-4 space-y-4 text-[17px] leading-relaxed text-ink-2">
          <p>Sellers want to know how many reps actually earn the OTE. Most job ads don&apos;t say.</p>
          <p>
            When you submit your job, there&apos;s one optional question: what percentage of fully ramped reps earned their full OTE last year? Answer it and a
            badge shows on your listing.
          </p>
          <p className="flex flex-wrap items-center gap-2 text-[15px] text-ink-3">
            <span>Example badge:</span>
            <AttainmentBadge pct={70} />
          </p>
          <p>The number comes from you, and it&apos;s shown as you report it. Skip the question and nothing shows. Nothing says it&apos;s missing either.</p>
        </div>
      </section>

      {/* Sponsored-job standards */}
      <section className="mt-16">
        <H2>What &ldquo;Sponsored&rdquo; means</H2>
        <div className="mt-4 space-y-4 text-[17px] leading-relaxed text-ink-2">
          <p>
            Every other job on Braun Board gets a Braun Read. It&apos;s my quick take on the posting: the pay, the red flags and green ones, what it leaves out,
            and what to ask on the first call.
          </p>
          <p>
            Sponsored jobs don&apos;t get one. <span className="font-semibold text-ink">I don&apos;t grade what I&apos;m paid to show.</span>
          </p>
          <p>
            Your job is labeled &ldquo;Sponsored&rdquo; on the home page and on its own page, with a note that you paid to feature it. Sponsorship isn&apos;t an
            endorsement. Sellers still make their own call.
          </p>
          <p>What I do check: it&apos;s a sales role, base pay is listed, and you&apos;ve approved the rewrite.</p>
        </div>
      </section>

      {/* Price and eligibility */}
      <section className="mt-16 rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <H2>Price</H2>
        <p className="mt-3 text-3xl font-bold tracking-tight">{price || "One price"}. Once.</p>
        <ul className="mt-4 space-y-2 text-[17px] leading-relaxed text-ink-2">
          <li>No subscription. No automatic renewal.</li>
          <li>Sales roles only, and base pay has to be listed.</li>
          <li>If your job doesn&apos;t qualify, you get a full refund.</li>
        </ul>
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

      {/* Expectations */}
      <section className="mt-16">
        <H2>What should you expect?</H2>
        <div className="mt-4 space-y-4 text-[17px] leading-relaxed text-ink-2">
          <p className="text-ink">A clearer job ad and promotion to an audience of salespeople.</p>
          <p>
            I can&apos;t promise a certain number of applicants or a hire. The goal is to help the right sellers understand the opportunity and decide whether to
            apply.
          </p>
        </div>
      </section>

      {/* Invitation */}
      <section className="mt-16 rounded-2xl border border-line bg-surface p-6 text-center sm:p-8">
        <p className="text-2xl font-bold tracking-tight">Have a sales job worth explaining?</p>
        <p className="mt-2 text-[17px] text-ink-2">Paste in your job. I&apos;ll take it from there.</p>
        <div className="mt-6">
          <Cta price={price} big />
        </div>
      </section>
    </div>
  );
}
