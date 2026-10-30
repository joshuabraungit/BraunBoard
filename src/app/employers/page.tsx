import type { Metadata } from "next";
import Link from "next/link";
import { formatPrice, sponsorPriceCents, SPONSOR_DAYS } from "@/lib/sponsor-form";
import { AttainmentBadge } from "@/components/SponsoredCard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  alternates: { canonical: "/employers" },
  title: "For employers: sponsor a sales job · Braun Board",
  description:
    "Why good sellers skip your job post, and how to fix it. Sponsor a sales job on Braun Board: featured on the home page, a LinkedIn post and a newsletter send. Josh reads every post.",
};

// Josh's voice: short lines, plain words, a little levity. No em dashes.
const DIFFERENT = [
  ["It's only sales jobs.", "No engineers. No marketers. Just SDRs, AEs, AMs, and the people who lead them."],
  ["Pay comes first.", "Every job shows base and OTE up front. Sellers here skip posts that hide it. So sponsored jobs have to show it too."],
  [
    "The question every seller wants answered.",
    "An OTE is a promise. What percentage of reps actually hit it? Most companies don't say. On Braun Board you can. Share it and it shows as a badge on your listing.",
  ],
  [
    "Plain English.",
    "Job posts love words like “synergy” and “fast-paced.” Sellers skim right past them. Here, every company gets a plain-English line about what it sells. Because nobody wants to sell something they can't explain.",
  ],
  ["A real person reads every post.", "That's me. Which brings us to how this works."],
] as const;

const GET = [
  [`${SPONSOR_DAYS} days at the top of the home page.`, "First thing sellers see."],
  ["A LinkedIn post.", "I share your job with my audience of sales folks."],
  ["A newsletter send.", "Your job goes to sellers who asked for jobs in their inbox."],
  ["Your own job page.", "Pay, what you sell, and an Apply button that goes straight to your posting."],
  ["A badge, if you've earned it.", "Share your OTE attainment and it shows right on your card. Sellers notice."],
] as const;

const STEPS = [
  [
    "Tell me about the job.",
    "Paste in your job description and a few details. Takes about five minutes. Then pay. There's one optional question most job boards never ask: what percentage of your ramped reps hit OTE last year? If your number's good, show it off. If you don't track it, skip it. Nothing shows, and nothing says it's missing.",
  ],
  ["I read it.", "Usually within one business day."],
  [
    "I suggest edits.",
    "I'll rewrite your description so sellers actually read it. And I'll help sharpen how you explain what you sell. You approve every word. Nothing goes up without your OK.",
  ],
  ["It goes live.", "On the date you pick. I'll email you the link."],
  ["Then it goes out.", "The LinkedIn post and the newsletter follow."],
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
    <section className="mt-10">
      <h2 className="text-xl font-bold tracking-tight">Before and after</h2>
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

function List({ items }: { items: readonly (readonly [string, string])[] }) {
  return (
    <ul className="mt-4 space-y-3 text-[15px] leading-relaxed">
      {items.map(([title, rest]) => (
        <li key={title} className="flex gap-2.5">
          <span aria-hidden="true" className="mt-0.5 font-bold text-accent">
            ✓
          </span>
          <span>
            <span className="font-semibold text-ink">{title}</span> <span className="text-ink-2">{rest}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function Cta({ price }: { price: string }) {
  return (
    <Link
      href="/sponsor"
      className="inline-flex min-h-12 items-center rounded-lg bg-ink px-6 text-[15px] font-semibold text-white hover:opacity-90"
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
      <p className="text-xs font-bold uppercase tracking-wide text-accent">For employers</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Why are good sellers skipping your job post?</h1>
      <div className="mt-4 space-y-3 text-lg leading-relaxed text-ink-2">
        <p>
          Because it reads like every other job post. Vague pay. Big words. No idea what they&apos;d actually sell.{" "}
          <span className="text-ink-3">(And probably &ldquo;fast-paced environment.&rdquo;)</span>
        </p>
        <p className="text-ink">Braun Board fixes that. It&apos;s a job board just for B2B sellers, and I read every post myself.</p>
      </div>
      <div className="mt-6">
        <Cta price={price} />
      </div>

      <section className="mt-12">
        <h2 className="text-xl font-bold tracking-tight">What makes it different</h2>
        <List items={DIFFERENT} />
      </section>

      <section className="mt-10 rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <h2 className="text-xl font-bold tracking-tight">What you get</h2>
        <List items={GET} />
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold tracking-tight">How it works</h2>
        <ol className="mt-4 space-y-4">
          {STEPS.map(([title, rest], i) => (
            <li key={title} className="flex gap-3">
              <span className="mt-0.5 font-serif text-xl font-bold leading-none text-accent">{i + 1}</span>
              <p className="text-[15px] leading-relaxed">
                <span className="font-semibold text-ink">{title}</span> <span className="text-ink-2">{rest}</span>
              </p>
            </li>
          ))}
        </ol>
      </section>

      <BeforeAfter />

      <section className="mt-10 rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <h2 className="text-xl font-bold tracking-tight">What it costs</h2>
        <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-ink-2">
          <p>
            <span className="font-semibold text-ink">{price || "One flat price"}. One time.</span> No subscription. No &ldquo;contact sales for pricing.&rdquo; (I&apos;d know. I
            teach sales.)
          </p>
          <p>
            <span className="font-semibold text-ink">Two rules:</span> it has to be a sales role, and it has to show base pay.
          </p>
          <p>
            <span className="font-semibold text-ink">If it doesn&apos;t qualify, you get a full refund.</span> No awkward back and forth.
          </p>
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
    </div>
  );
}
