import type { Metadata } from "next";
import { ResultsStats, SourcesTable } from "@/components/SponsorResults";
import type { SourceRow } from "@/lib/sponsor-results";
import Image from "next/image";
import Link from "next/link";
import { formatPrice, sponsorPriceCents, SPONSOR_DAYS } from "@/lib/sponsor-form";
import { PHONE_DISPLAY, PHONE_TEL } from "@/lib/contact";
import { AttainmentBadge } from "@/components/SponsoredCard";
import { RewriteOwl } from "@/components/RewriteOwl";

export const metadata: Metadata = {
  alternates: { canonical: "/employers" },
  title: "For employers: sponsor a sales job · Braun Board",
  description:
    "The best sellers already have jobs. They read Josh Braun's posts. Josh rewrites your sales job ad in plain English, pins it to Braun Board for 30 days, and shares it with his 289,000 LinkedIn followers and his newsletter. $750, one payment.",
};

// Josh's voice: plain English, short paragraphs, warm, a little funny. No hype, no em dashes,
// and no promises about hiring results. Only claims the product actually backs up.
const GET = [
  ["A plain-English rewrite.", "What you sell, who buys it, and what the job looks like day to day. You approve it before it goes up."],
  [`${SPONSOR_DAYS} days pinned to the top of the home page.`, "Above the newest jobs, where sellers start."],
  ["One LinkedIn post.", "I share your job with my 289,000 followers."],
  ["One newsletter send.", "Your job goes out in my newsletter."],
  ["Your own job page.", "Pay, what you sell, and an Apply button that goes to your application."],
  ["A live results page.", "Views, apply clicks, and where people came from. Check it anytime."],
  ["Fast Track, if you want it.", "A few guaranteed screening calls for Braun Board readers. More on that below."],
  ["An optional OTE badge.", "More on that below."],
] as const;

const STEPS = [
  ["Submit and pay.", "Paste in your job and add pay, location, and when you'd like it to start. About five minutes."],
  ["I review it.", "Usually within one business day. If it isn't a sales role or base pay is missing, you get a full refund."],
  ["I rewrite it. You approve it.", "I send you the plain-English version. Change anything you like. Nothing goes up until you say yes."],
  [
    "It goes live, and I share it.",
    "As soon as you approve the rewrite. Two jobs are featured at a time, so if both spots are taken, yours starts when one opens. Then the LinkedIn post and the newsletter send.",
  ],
  [`It ends after ${SPONSOR_DAYS} days.`, "No renewal. No surprise charge."],
] as const;

// Illustrative: the "before" is written for this page, not taken from a real posting.
const BEFORE =
  "As a mission-driven, insights-led organization, we empower public sector, nonprofit, and enterprise stakeholders to unlock actionable intelligence across diverse audience ecosystems. Leveraging a proprietary blend of quantitative and qualitative methodologies, we deliver end-to-end research solutions that drive evidence-based decision-making at scale.";
const AFTER = [
  {
    head: "What you'll sell",
    lines: [
      "Imagine ordering twenty pizzas after asking one person what they like.",
      "Hope everyone likes anchovies.",
      "Now picture a town deciding what to build on an empty lot.",
      "Three people at a public meeting want a merry-go-round.",
      "What about the thousands who aren't there?",
      "You're selling survey software that helps nonprofits and towns reach a representative mix of residents and find out what matters to them.",
      "So the town can decide what to build before pouring the concrete.",
    ],
  },
  {
    head: "The job",
    lines: [
      "They need someone to bring in new customers. That's you.",
      "You'll focus on opening and growing new markets. You'll start the conversations, run each deal from first call to signed contract, and stay close after the sale.",
      "It's a quota-carrying role on a small, fully remote team.",
    ],
  },
];

// Real numbers from a recent sponsor, 6 days into their run (Nov 8, 2026). Name and role removed.
const SAMPLE = { views: 115, clicks: 16 };
const SAMPLE_SOURCES: SourceRow[] = [
  { label: "Braun Board home page and direct", views: 89, pct: 86, clicks: 0 },
  { label: "LinkedIn", views: 11, pct: 11, clicks: 0 },
  { label: "Google", views: 4, pct: 4, clicks: 0 },
];

// The real LinkedIn post for Embold Research (shared with their OK, Nov 2026).
const POST_URL = "https://lnkd.in/p/eKVtZvG7";
const POST_TOP = `This is either your dream sales job or your worst nightmare.

My favorite sales job had no playbook, no territory, and no evidence the comp plan worked.

I was the first sales hire at Jellyvision.

Nobody had hit OTE yet. Nobody had been there long enough to miss it either.`;
const POST_REST = `I loved figuring it out.

My first 40 cold emails got zero replies. Then I tried something else and someone wrote back.

You try something. Nothing.
You try something else. Someone buys.
Then someone else.

And one day, the thing you figured out becomes what the next hire gets taught.

Your fingerprints are on the business. That's a pretty cool feeling.

It's what caught my attention about this opportunity at Embold Research.

Nobody wants to spend years and millions on a project and then find out the town hates it.

Embold helps organizations understand what communities think about projects like housing, clean energy, and data centers before they pour concrete.

A few reps already sell Embold alongside another brand.

They're hiring a remote Director of Growth focused entirely on Embold, opening new markets and figuring out what works.

If you want a playbook on day one, this one will drive you nuts.
If a blank page sounds fun, keep reading.

Embold gave me five Fast Track codes to share on Braun Board. Three are gone.

Grab one of the last two on the job page, include it in your application, and you're guaranteed a 25-minute screening call with their team.

You get to ask your questions. They get to meet the person behind the résumé.

Two codes left. Two conversations.

Link in the comments.`;
// Counts frozen as of the evening of Nov 11, 2026 (its first day).
const POST_STATS = { impressions: "6,962", comments: 26, when: "on its first day" };
// Real comments from the post, names shown, no photos.
const POST_COMMENTS = [
  {
    name: "Dmytro Markov",
    initials: "DM",
    headline: "B2B Marketing & Distribution",
    text: "What would success look like for the Director of Growth in the first six months, given they’ll be opening new markets and figuring out the playbook?",
    // Embold's own reply on the post (Nov 2026).
    reply: {
      name: "Embold Research",
      initials: "ER",
      text: "Great question! At six months, success means you’ve built a solid pipeline, are meeting your metrics, and are ramping toward your quarterly revenue goals. Just as important, you’ll know our research and work well enough to show clients how it solves their problems. You'll continue to be well supported and guided by your manager and team.",
    },
  },
  {
    name: "Sumit Gupta",
    initials: "SG",
    headline: "Founder, 10GenPartners",
    text: "The founder's side of this matters too, Josh. A first sales hire who loves figuring it out only works if the founder can watch 40 cold emails get zero replies without stepping in to take over.",
  },
  {
    name: "Arthur J.",
    initials: "AJ",
    headline: "Founder & CEO, Emformance",
    text: "As a founder, I've learned to be honest with early hires about exactly that, because the right person sees it as the appeal.",
  },
  {
    name: "Jay Johnston",
    initials: "JJ",
    headline: "elitetechsales.com",
    text: "Some sellers want the playbook on day one. Some want the blank page. Knowing which one you are is the whole game.",
  },
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
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Your sales job, in front of sellers who already have one.</h1>
      <div className="mt-5 flex items-center gap-3">
        <Image src="/josh-braun.png" alt="Josh Braun" width={52} height={52} className="h-[52px] w-[52px] shrink-0 rounded-full" priority />
        <p className="text-[15px] leading-snug text-ink-2">
          Hi, I&apos;m Josh. I used to hire salespeople. I&apos;ve written some pretty bad job ads myself.
        </p>
      </div>
      <div className="mt-5 space-y-3 text-lg leading-relaxed text-ink">
        <p>The best sellers aren&apos;t scrolling job boards. They&apos;re busy selling.</p>
        <p>They do read my posts. I&apos;m in front of sellers all day, and 289,000 people follow me on LinkedIn.</p>
      </div>
      <p className="mt-4 text-lg leading-relaxed text-ink-2">
        Hiring a salesperson? I&apos;ll rewrite your ad in plain English, pin it to Braun Board for {SPONSOR_DAYS} days, and share it on LinkedIn and in my newsletter.
      </p>
      <p className="mt-4 text-xl font-bold">{price || "One price"}. One payment.</p>
      <div className="mt-6">
        <Cta price={price} big />
      </div>

      {/* What you get */}
      <section className="mt-14 border-t border-line pt-12">
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
        <div className="relative mt-14 rounded-2xl border border-line bg-bg p-6 sm:p-7">
          <RewriteOwl asleep className="absolute -top-[60px] right-6 h-[64px] w-[96px]" />
          <p className="text-xs font-bold uppercase tracking-wide text-ink-3">Before</p>
          <p className="mt-3 text-[16px] leading-relaxed text-ink-3">{BEFORE}</p>
        </div>
        <div className="relative mt-16 rounded-2xl border border-line bg-surface p-6 shadow-[0_8px_30px_rgba(22,20,15,0.06)] sm:p-7">
          <RewriteOwl className="absolute -top-[60px] right-6 h-[64px] w-[96px]" />
          <p className="text-xs font-bold uppercase tracking-wide text-accent">After</p>
          {AFTER.map(({ head, lines }, i) => (
            <div key={head} className={i ? "mt-6" : "mt-3"}>
              <p className="text-xl font-bold tracking-tight">{head}</p>
              <div className="mt-2 space-y-3 text-[17px] leading-relaxed text-ink">
                {lines.map((t) => (
                  <p key={t}>{t}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Results page */}
      <section className="mt-16">
        <H2>How you&apos;ll know it worked</H2>
        <div className="mt-4 space-y-4 text-[17px] leading-relaxed text-ink-2">
          <p>Most job boards take your money and go quiet. You get a private results page instead. It updates on its own, so you never have to ask me how it&apos;s going.</p>
        </div>
        <div className="mt-5 rounded-2xl border border-line bg-bg p-4 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-lg font-bold tracking-tight">Acme · Sales role</p>
            <p className="text-sm font-semibold text-accent">Day 6 of 30</p>
          </div>
          <div className="mt-4">
            <ResultsStats views={SAMPLE.views} clicks={SAMPLE.clicks} />
          </div>
          <div className="mt-4 rounded-xl border border-line bg-surface p-4">
            <p className="font-bold">Where people came from</p>
            <SourcesTable rows={SAMPLE_SOURCES} showClicks={false} />
          </div>
        </div>
        <p className="mt-3 text-[15px] text-ink-3">Real numbers from a recent sponsor, six days in, before the LinkedIn post and newsletter went out. Name changed.</p>
      </section>

      {/* The LinkedIn post */}
      <section className="mt-16">
        <H2>What the LinkedIn post looks like</H2>
        <div className="mt-4 space-y-4 text-[17px] leading-relaxed text-ink-2">
          <p>I don&apos;t paste your job ad into a post. I write about the job the way I&apos;d talk about it with a friend, and I tell sellers what to ask you.</p>
          <p>You approve the post before it goes up, same as the rewrite. Here&apos;s a real one, shared with Embold Research&apos;s OK.</p>
        </div>
        <div className="mt-5 rounded-2xl border border-line bg-surface p-5 shadow-[0_8px_30px_rgba(22,20,15,0.06)] sm:p-6">
          <div className="flex items-center gap-3">
            <Image src="/josh-braun.png" alt="" width={48} height={48} className="h-12 w-12 rounded-full" />
            <div className="min-w-0">
              <p className="text-[15px] font-semibold leading-tight">Josh Braun</p>
              <p className="text-xs text-ink-3">Sales trainer · 289,000 followers</p>
            </div>
          </div>
          <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{POST_TOP}</p>
          <details className="group mt-3">
            <summary className="cursor-pointer list-none text-[15px] font-semibold text-ink-3 hover:text-ink group-open:hidden">…see more</summary>
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{POST_REST}</p>
          </details>

          {/* Real numbers and comments from the post */}
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3 text-sm text-ink-3">
            <span>
              <span className="font-semibold text-ink">{POST_STATS.impressions}</span> impressions
            </span>
            <span>
              <span className="font-semibold text-ink">{POST_STATS.comments}</span> comments
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {POST_COMMENTS.map((c) => (
              <div key={c.name} className="flex gap-3">
                <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-line text-xs font-bold text-ink-2">
                  {c.initials}
                </span>
                <div className="min-w-0 rounded-xl bg-bg px-4 py-3">
                  <p className="text-sm font-semibold leading-tight">{c.name}</p>
                  <p className="text-xs text-ink-3">{c.headline}</p>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink">{c.text}</p>
                  {"reply" in c && c.reply && (
                    <div className="mt-3 flex gap-3">
                      <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-white">
                        {c.reply.initials}
                      </span>
                      <div className="min-w-0 rounded-xl border border-line bg-surface px-4 py-3">
                        <p className="text-sm font-semibold leading-tight">
                          {c.reply.name}{" "}
                          <span className="ml-1 rounded bg-line px-1.5 py-0.5 text-[11px] font-semibold text-ink-2">Employer</span>
                        </p>
                        <p className="mt-2 text-[15px] leading-relaxed text-ink">{c.reply.text}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-3 text-[15px] text-ink-3">
          {POST_STATS.impressions} impressions and {POST_STATS.comments} comments {POST_STATS.when}. Sellers ask real questions about the job, and founders weigh in.
          You&apos;re welcome to jump in and answer.{" "}
          <a href={POST_URL} target="_blank" rel="noopener" className="font-semibold text-ink underline underline-offset-2">
            See the post on LinkedIn ↗
          </a>
        </p>
      </section>

      {/* Fast Track */}
      <section className="mt-16">
        <H2>Fast Track</H2>
        <div className="mt-4 space-y-4 text-[17px] leading-relaxed text-ink-2">
          <p>Most applications go into a pile. Sellers know it, so a lot of good ones never apply.</p>
          <p>
            Fast Track changes that. You pick a small number, like five. Each one is a guaranteed screening call. Braun Board readers claim a code on your job
            page and put it on your application. Your team sets up the call.
          </p>
          <p>It&apos;s optional, and it&apos;s part of the package.</p>
        </div>
        <div className="mt-5 rounded-2xl border-2 border-ink bg-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-ink">Fast Track</p>
            <p className="text-sm font-bold text-accent">2 of 5 left</p>
          </div>
          <p className="mt-2 text-[17px] font-semibold leading-snug text-ink">5 guaranteed 25-minute screening calls with Acme.</p>
          <div className="mt-3 flex gap-1.5" aria-hidden>
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className={`h-2.5 flex-1 rounded-full ${i < 2 ? "bg-accent" : "bg-line"}`} />
            ))}
          </div>
          <p className="mt-3 text-[15px] text-ink-2">Grab a code, put it on your application, and Acme&apos;s team will set up a call with you. Once they&apos;re gone, they&apos;re gone.</p>
        </div>
        <p className="mt-3 text-[15px] text-ink-3">What sellers see on your job page.</p>
        <div className="mt-6 space-y-4 text-[17px] leading-relaxed text-ink-2">
          <p className="font-semibold text-ink">Why it matters</p>
          <ul className="space-y-3">
            <li className="flex gap-3">
              <span aria-hidden="true" className="mt-0.5 font-bold text-accent">✓</span>
              <span>
                <span className="font-semibold text-ink">It gets sellers off the fence.</span> A real shot at a conversation is a good reason for someone who
                already has a job to raise their hand.
              </span>
            </li>
            <li className="flex gap-3">
              <span aria-hidden="true" className="mt-0.5 font-bold text-accent">✓</span>
              <span>
                <span className="font-semibold text-ink">You know where they came from.</span> Every code is tied to a name and email, so you can spot Braun Board
                applicants right away.
              </span>
            </li>
            <li className="flex gap-3">
              <span aria-hidden="true" className="mt-0.5 font-bold text-accent">✓</span>
              <span>
                <span className="font-semibold text-ink">You stay in control.</span> You choose how many calls and how long they are. A screening call is just a
                conversation. Whether anyone moves forward is still up to you.
              </span>
            </li>
          </ul>
          <p>Embold Research offered five. All five were claimed.</p>
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
            Every other job on Braun Board gets a Braun Read. It&apos;s my quick take on the posting: the pay, the red lights and green ones, what it leaves out,
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
          <a href="mailto:josh@braunboard.com" className="font-semibold text-ink underline underline-offset-2">
            josh@braunboard.com
          </a>
        </p>
        <p className="mt-1 text-sm text-ink-3">
          Or call or text:{" "}
          <a href={PHONE_TEL} className="font-semibold text-ink underline underline-offset-2">
            {PHONE_DISPLAY}
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
          <p className="text-ink">A job ad people can understand. Put in front of salespeople.</p>
          <p>Will you get 50 applicants? Find your next hire? I don&apos;t know.</p>
          <p>What I can do is make it clear what you&apos;re offering, so sellers can decide if it&apos;s for them.</p>
        </div>
      </section>

      {/* Invitation */}
      <section className="mt-16 rounded-2xl border border-line bg-surface p-6 text-center sm:p-8">
        <p className="text-2xl font-bold tracking-tight">Have a sales job worth explaining?</p>
        <p className="mt-2 text-[17px] text-ink-2">Paste in your job. I&apos;ll take it from there.</p>
        <Image src="/josh-signature.png" alt="Josh" width={640} height={320} className="mx-auto mt-2 h-auto w-[150px] sm:w-[170px]" />
        <div className="mt-4">
          <Cta price={price} big />
        </div>
      </section>
    </div>
  );
}
