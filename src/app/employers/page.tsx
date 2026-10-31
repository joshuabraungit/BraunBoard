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

// Based on a real sponsored post. Reworded so it can't be traced back to the company, same flavor.
const BEFORE_TEXT =
  "We are a trusted research partner for public sector organizations, nonprofits, and mission-driven brands seeking actionable insights into the audiences they serve. Leveraging a blend of curiosity, rigor, and cutting-edge methodology, we empower leaders to make data-driven decisions with confidence. We are looking for a full-time Director of Growth to drive top-of-funnel pipeline generation and own the end-to-end sales cycle.";
const AFTER_TEXT =
  "Governments, nonprofits, and public affairs teams make big decisions about the people they serve. Without good research, they're guessing. We help them find out what people actually think. We need someone to bring in new customers. That's you. You'll focus on one kind of customer, like city governments or nonprofits, and run each deal from first call to signed contract.";
const AFTER_STORY =
  "A city agency needs to know what residents really think before a big decision. Listening to a few loud voices gives the wrong answer. This company measures what the whole community thinks, from one neighborhood to the entire country, so leaders can decide with confidence.";
const NOTES = [
  ["What they sell.", "Before, a seller has to guess. After, they know in eight words."],
  ["The first three lines.", "That's all the card shows. Before, it's a mission statement. After, it's a problem and a reason to care."],
  ["The OTE badge.", "Optional. If your number's good, it's the first thing sellers notice. (70% is an example.)"],
] as const;

function Num({ n, off }: { n: number; off?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${off ? "bg-line-strong text-ink-2" : "bg-accent text-white"}`}
    >
      {n}
    </span>
  );
}

/** A sponsored card exactly as sellers see it, before and after, with numbered differences. Not clickable: it's an example. */
function DemoCard({ after }: { after: boolean }) {
  return (
    <div className={`rounded-2xl border-[1.5px] p-5 ${after ? "border-amber/40 bg-surface" : "border-line bg-bg"}`}>
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-full bg-amber-soft px-2.5 py-0.5 text-xs font-semibold text-amber">Sponsored</span>
        <span className="text-xs text-ink-3">Hiring now</span>
      </div>
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-line bg-bg font-semibold text-ink-2">
          R
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[17px] font-bold leading-snug tracking-tight">Director of Growth</p>
          <p className="mt-0.5 text-sm text-ink-2">A research company · Remote</p>
          <p className="mt-2 text-[15px] font-semibold text-accent">
            <span className="whitespace-nowrap">$92K–$106K base</span> · <span className="whitespace-nowrap">$133.9K–$148.9K OTE</span>
          </p>
          {after ? (
            <>
              <div className="mt-2 flex gap-2">
                <Num n={3} />
                <AttainmentBadge pct={70} />
              </div>
              <div className="mt-2 flex gap-2 text-sm">
                <Num n={1} />
                <p>
                  <span className="text-ink-3">What they sell: </span>
                  <span className="font-semibold">Surveys that show what a whole community thinks</span>
                </p>
              </div>
              <div className="mt-2 flex gap-2">
                <Num n={2} />
                <p className="line-clamp-3 text-[15px] leading-relaxed text-ink-2">{AFTER_TEXT}</p>
              </div>
            </>
          ) : (
            <>
              <div className="mt-2 flex gap-2 text-sm italic text-ink-3">
                <Num n={1} off />
                <p>No line about what they sell</p>
              </div>
              <div className="mt-2 flex gap-2">
                <Num n={2} off />
                <p className="line-clamp-3 text-[15px] leading-relaxed text-ink-2">{BEFORE_TEXT}</p>
              </div>
              <div className="mt-2 flex gap-2 text-sm italic text-ink-3">
                <Num n={3} off />
                <p>No OTE attainment shared</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function BeforeAfter() {
  return (
    <section>
      <h2 className="text-2xl font-bold tracking-tight">Before and after</h2>
      <p className="mt-1 text-[15px] text-ink-2">The same job, as sellers see it on the home page. Based on a real sponsored post, details changed.</p>
      <div className="mt-4 space-y-5">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-3">Before</p>
          <DemoCard after={false} />
        </div>
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-accent">After</p>
          <DemoCard after />
          <details className="mt-2 text-sm">
            <summary className="cursor-pointer text-ink-3 hover:text-ink">On their job page, sellers also get the short version</summary>
            <p className="mt-1.5 leading-relaxed text-ink-2">&ldquo;{AFTER_STORY}&rdquo;</p>
          </details>
        </div>
      </div>
      <ol className="mt-5 space-y-2.5">
        {NOTES.map(([title, rest], i) => (
          <li key={title} className="flex gap-2.5 text-[15px] leading-relaxed">
            <Num n={i + 1} />
            <p>
              <span className="font-semibold text-ink">{title}</span> <span className="text-ink-2">{rest}</span>
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

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
      {/* The letter */}
      <p className="text-xs font-bold uppercase tracking-wide text-accent">For employers</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">I&apos;m Josh, founder of Braun Board.</h1>
      <div className="mt-6 space-y-5 text-lg leading-relaxed text-ink">
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
        <p className="font-semibold">Let&apos;s make yours easier to understand.</p>
      </div>
      <div className="mt-8">
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

      <div className="mt-16">
        <BeforeAfter />
      </div>

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
