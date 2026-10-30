import type { Metadata } from "next";
import Link from "next/link";
import { formatPrice, sponsorPriceCents, SPONSOR_DAYS } from "@/lib/sponsor-form";

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

// A real sponsored post, name removed (Josh hasn't asked the company yet). Wording lightly trimmed.
const BEFORE = [
  "We are an audience research partner for governments, 501(c)(3)s, public affairs teams, and companies that seek reliable research on the communities they serve. We combine curiosity, rigor, and innovative technology to reach everyone from specific communities to the broader public, so leaders can make decisions with confidence.",
  "We are seeking a full-time Director of Growth to build a top-of-funnel pipeline and manage the full sales cycle. This is a quota-carrying role focused on targeted pipeline and business development, vertical-market specialization, full sales cycle, and consultative relationship ownership.",
];
const AFTER = [
  "Governments, nonprofits, and public affairs teams make big decisions about the people they serve. Without good research, they're guessing.",
  "We help them find out what people actually think.",
  "We need someone to bring in new customers. That's you.",
  "You'll focus on one kind of customer, like city governments or nonprofits. You'll start the conversations, run each deal from first call to signed contract, and stay close after the sale.",
  "It's a quota-carrying role on a small, fully remote team.",
];

function BeforeAfter() {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold tracking-tight">Before and after</h2>
      <p className="mt-1 text-[15px] text-ink-2">A real sponsored post. Name removed, same job.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-line bg-bg p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-3">Before</p>
          <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink-2">
            {BEFORE.map((t) => (
              <p key={t}>{t}</p>
            ))}
          </div>
          <p className="mt-4 text-sm text-ink-3">Accurate. Also on every job post. A seller can&apos;t tell what they&apos;d sell or who they&apos;d call.</p>
        </div>
        <div className="rounded-2xl border-[1.5px] border-amber/40 bg-surface p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-accent">After</p>
          <p className="mt-3 text-sm">
            <span className="text-ink-3">What they sell: </span>
            <span className="font-semibold">Surveys that show what a whole community thinks</span>
          </p>
          <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink">
            {AFTER.map((t) => (
              <p key={t}>{t}</p>
            ))}
          </div>
          <p className="mt-4 text-sm text-ink-3">Problem first. Plain words. Then where the seller fits in.</p>
        </div>
      </div>
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
