import type { Metadata } from "next";
import Link from "next/link";
import { PicksSignup } from "@/components/PicksSignup";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Before You Say Yes · Your first AE job interview kit · Braun Board",
  description: "A free interview kit for SDRs going for their first AE role: 22 questions, what good and bad answers sound like, and an offer comparison sheet. By Josh Braun.",
};

const INSIDE = [
  ["22 questions", "for the recruiter, the hiring manager and a current rep, with why each one matters, plus three that show how you sell."],
  ["What good and bad answers sound like", "a green flag and a red flag example for every question."],
  ["When answers get vague", "what to say when you hear \"most people hit quota\" or \"the plan is pretty standard.\""],
  ["Your nonnegotiables", "decide what you'd walk away over before the first call."],
  ["Offer comparison and pay scenarios", "put two offers side by side and see what you'd earn at 50%, 100% and 125% of quota."],
] as const;

// Where the visitor came from, carried into the download link so Admin can tell what's working.
const FROM = new Set(["job-page", "ask", "picks-email", "alert-email"]);

export default async function KitPage({ searchParams }: { searchParams: Promise<{ picks?: string; from?: string }> }) {
  const { picks, from } = await searchParams;
  const source = from && FROM.has(from) ? from : "kit-page";
  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-xs font-bold uppercase tracking-wide text-accent">Free interview kit</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Before You Say Yes</h1>
      <p className="mt-2 text-lg text-ink-2">Your first AE job interview kit. Ask better questions before accepting the offer.</p>

      <p className="mt-5 text-[15px] leading-relaxed text-ink-2">
        An offer might say $180,000 OTE. That tells you what you could earn at target. It doesn&apos;t tell you whether the
        territory, pipeline, coaching and commission rules make that target realistic. This kit helps you find out before you
        say yes.
      </p>

      <div className="mt-6 rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <h2 className="font-bold">What&apos;s inside</h2>
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
        {/* A plain link, not <Link>, so prefetching never counts as a download. */}
        <a
          href={`/kit/download?from=${source}`}
          target="_blank"
          rel="nofollow noopener"
          className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-ink px-5 text-sm font-semibold text-white hover:opacity-90"
        >
          Download the kit (PDF) →
        </a>
        <p className="mt-2 text-xs text-ink-3">Free. No email needed. 28 pages. Fill it in on your computer, or print it and write by hand.</p>
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
