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
    "Takes about five minutes. Then pay. There's one optional question most job boards never ask: what percentage of your ramped reps hit OTE last year? If your number's good, show it off. If you don't track it, skip it. Nothing shows, and nothing says it's missing.",
  ],
  ["I read it.", "Usually within one business day."],
  [
    "I suggest edits.",
    "I'll rewrite your description so sellers actually read it. And I'll help sharpen how you explain what you sell. You approve every word. Nothing goes up without your OK.",
  ],
  ["It goes live.", "On the date you pick. I'll email you the link."],
  ["Then it goes out.", "The LinkedIn post and the newsletter follow."],
] as const;

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
