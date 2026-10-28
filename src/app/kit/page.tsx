import type { Metadata } from "next";
import Link from "next/link";
import { PicksSignup } from "@/components/PicksSignup";
import { PlaybookTabs } from "@/components/PlaybookTabs";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  alternates: { canonical: "/kit" },
  title: "Before You Say Yes · Your first AE job interview kit · Braun Board",
  description: "A free interview kit for SDRs going for their first AE role: Josh Braun's top five interview questions, 19 more for the recruiter, hiring manager and current reps, what good and bad answers sound like, and an offer comparison sheet.",
};

// The five Josh asks in every sales interview. Same words as page 3 of the kit.
const TOP_FIVE = [
  {
    q: "What do your top sellers have in common?",
    why: "You're getting past the job description and learning how people do the job well. If something connects to your experience, share a quick example.",
  },
  {
    q: "Six months from now, what would make you say hiring me was a great decision?",
    why: "You're finding out what matters to the person hiring you. Now you can share a relevant story, and decide whether the expectations sound reasonable.",
  },
  {
    q: "What percentage of fully ramped reps earned their full OTE last year?",
    why: "The earnings in the job posting are one thing. How many people actually earned that amount is another.",
  },
  {
    q: "What does the onboarding and ramp period look like?",
    why: "It tells you how seriously the company invests in setting new reps up for success from day one, versus expecting them to figure things out on their own.",
  },
  {
    q: "When are you looking to make a decision?",
    then: "Then: \u201cIs there anything preventing you from moving me forward to the next round?\u201d",
    why: "Sales takes leadership. You don't have to keep telling them you'd be good at sales. Give them a little preview.",
  },
] as const;

const INSIDE = [
  ["My top five, plus 19 more questions", "for the recruiter, the hiring manager and a current rep, with why each one matters."],
  ["What good and bad answers sound like", "a green flag and a red flag example for each recruiter, manager and rep question."],
  ["Culture signals", "how they talk about their reps, the last person in the role and your time, and what to listen for."],
  ["When answers get vague", "what to say when you hear \"most people hit quota\" or \"the plan is pretty standard.\""],
  ["Your nonnegotiables", "decide what you'd walk away over before the first call."],
  ["Offer comparison and pay scenarios", "put two offers side by side and see what you'd earn at 50%, 100% and 125% of quota."],
] as const;

// Where the visitor came from, carried into the download link so Admin can tell what's working.
const FROM = new Set(["job-page", "ask", "picks-email", "alert-email", "outreach"]);

export default async function KitPage({ searchParams }: { searchParams: Promise<{ picks?: string; from?: string }> }) {
  const { picks, from } = await searchParams;
  const source = from && FROM.has(from) ? from : "kit-page";
  return (
    <div className="mx-auto max-w-2xl">
      <PlaybookTabs active="/kit" />
      <p className="text-xs font-bold uppercase tracking-wide text-accent">Free interview kit</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Before You Say Yes</h1>
      <p className="mt-2 text-lg text-ink-2">Your first AE job interview kit. Ask better questions before accepting the offer.</p>

      <p className="mt-5 text-[15px] leading-relaxed text-ink-2">
        An offer might say $180,000 OTE. That tells you what you could earn at target. It doesn&apos;t tell you whether the
        territory, pipeline, coaching and commission rules make that target realistic. This kit helps you find out before you
        say yes.
      </p>

      <section id="top-five" className="mt-8 scroll-mt-24">
        <h2 className="text-xl font-bold tracking-tight">&ldquo;Do you have any questions for us?&rdquo;</h2>
        <p className="mt-1 text-[15px] text-ink-2">If you&apos;re interviewing for a sales job, here are the five I always ask.</p>
        <ol className="mt-4 space-y-4">
          {TOP_FIVE.map((t, i) => (
            <li key={t.q} className="flex gap-3">
              <span className="mt-0.5 font-serif text-xl font-bold leading-none text-accent">{i + 1}</span>
              <div>
                <p className="font-semibold">&ldquo;{t.q}&rdquo;</p>
                {"then" in t && <p className="mt-1 text-[15px] text-ink">{t.then}</p>}
                <p className="mt-1 text-[15px] leading-relaxed text-ink-2">{t.why}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-8 rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <h2 className="font-bold">What&apos;s inside the kit</h2>
        <ul className="mt-3 space-y-2.5 text-[15px]">
          {INSIDE.map(([title, rest]) => (
            <li key={title} className="flex gap-2.5">
              <span aria-hidden="true" className="mt-0.5 font-bold text-accent">✓</span>
              <span>
                <span className="font-semibold">{title}:</span> <span className="text-ink-2">{rest}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-ink-2">You won&apos;t ask all 24. Start with the top five, then pick the few that fit you and the conversation.</p>
        {/* A plain link, not <Link>, so prefetching never counts as a download. */}
        <a
          href={`/kit/download?from=${source}`}
          target="_blank"
          rel="nofollow noopener"
          className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-ink px-5 text-sm font-semibold text-white hover:opacity-90"
        >
          Download the kit (PDF) →
        </a>
        <p className="mt-2 text-xs text-ink-3">Free. No email needed. 29 pages. Fill it in on your computer, or print it and write by hand.</p>
      </div>

      <p className="mt-10 font-semibold">Want sales jobs that pass these questions, sent to you every Tuesday?</p>
      <div className="mt-3">
        <PicksSignup back="/kit" source="kit" status={picks} compact />
      </div>

      <p className="mt-8 text-sm text-ink-2">
        Got an offer and want a second set of eyes? <Link href="/ask" className="font-semibold text-ink underline underline-offset-2">Ask me</Link>.
      </p>
    </div>
  );
}
