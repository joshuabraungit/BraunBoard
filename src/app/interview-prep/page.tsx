import type { Metadata } from "next";
import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { PicksSignupFromUrl } from "@/components/PicksSignupFromUrl";
import { PlaybookTabs } from "@/components/PlaybookTabs";
import { toolsPublic } from "@/lib/job-tools/gate";

export const metadata: Metadata = {
  alternates: { canonical: "/interview-prep" },
  title: "3-2-1 Interview Prep · Braun Board",
  description: "3 numbers to know, 2 stories to tell, 1 question to ask. Interview prep for salespeople, short enough to remember without notes.",
};

const PROMPT = `Help me prep for a sales interview using 3-2-1: 3 numbers to know, 2 stories to tell, 1 question to ask.

Interview stage: [recruiter screen / hiring manager / panel or role play / final round]

3 numbers to know: the 3 numbers a hiring manager for this job is most likely to ask me about (quota attainment, revenue closed or pipeline built, average deal size). Copy each one from my résumé exactly as written. If one isn't on my résumé, tell me it's a number I should know, and don't estimate it.

2 stories to tell: the 2 deal stories from my résumé that best fit this job. One win, and one loss or stall if I have one. For each: a short title, the interview question it answers, and 3 short beats (the situation, what I did, how it ended).

1 question to ask: the one question that tells me the most about whether this job is real. If the posting doesn't already answer it, ask what percentage of the team hit quota last year.

Rules:
- Use only what my résumé says. Never invent a deal, number, customer or outcome.
- Plain words. Short enough to glance at mid-call.

Job description:
[paste]

My résumé:
[paste]`;

const PARTS: [string, string, string][] = [
  ["3", "numbers to know", "The ones they'll ask about: quota attainment, what you closed or built, deal size. Pulled straight from your résumé. If one's missing, I tell you to know it. I don't guess it."],
  ["2", "stories to tell", "A win, and a loss or a stall. Three beats each: the situation, what you did, how it ended."],
  ["1", "question to ask", "The one that tells you the most about whether the job is real. Usually: what percentage of the team hit quota last year?"],
];

export default function InterviewPrepPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PlaybookTabs active="/interview-prep" />

      <p className="text-xs font-bold uppercase tracking-wide text-accent">3-2-1 Interview Prep</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Walk in with six things. That&apos;s it.</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
        Most interview prep is a 20-page doc you never look at again. In the room, we remember a few things, not a few dozen. So keep it to 3 numbers, 2 stories and 1 question, and know them cold.
      </p>

      <section className="mt-8 space-y-4">
        {PARTS.map(([n, t, d]) => (
          <div key={t} className="flex gap-3">
            <span className="mt-0.5 font-serif text-3xl font-bold leading-none text-accent">{n}</span>
            <div>
              <p className="font-semibold">{t}</p>
              <p className="text-[15px] text-ink-2">{d}</p>
            </div>
          </div>
        ))}
      </section>

      <p className="mt-6 text-[15px] leading-relaxed text-ink-2">
        <span className="font-semibold text-ink">Nothing made up.</span> Every number and story comes from your résumé or what you write in. If it isn&apos;t there, it doesn&apos;t go on the sheet.
      </p>

      {toolsPublic() && (
        <Link href="/jobs" className="mt-8 flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-5 hover:border-line-strong">
          <span>
            <span className="block font-semibold">On Braun Board, it&apos;s built in</span>
            <span className="block text-sm text-ink-2">Add your résumé once. Every job has a 3-2-1 box. No pasting.</span>
          </span>
          <span className="shrink-0 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white">Find a job →</span>
        </Link>
      )}

      <section id="prompt" className="mt-12 scroll-mt-24">
        <h2 className="text-xl font-bold tracking-tight">Or use the prompt</h2>
        <p className="mt-1 text-[15px] text-ink-2">Works in Claude, ChatGPT or any AI. Paste the job description and your résumé where it says [paste].</p>
        <div className="mt-4 rounded-2xl border border-line bg-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold">3-2-1 Interview Prep</p>
            <CopyButton text={PROMPT} label="Copy prompt" className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:opacity-90" />
          </div>
          <pre className="mt-3 max-h-80 overflow-y-auto whitespace-pre-wrap rounded-xl bg-bg p-4 font-sans text-sm leading-relaxed text-ink-2">{PROMPT}</pre>
        </div>
      </section>

      <p className="mt-10 text-[15px] text-ink-2">
        Want to stand out before the interview? Give the hiring manager something nobody else sends.{" "}
        <Link href="/proof-page" className="font-semibold text-ink underline underline-offset-2">Build a proof page</Link>. Got an offer?{" "}
        <Link href="/kit" className="font-semibold text-ink underline underline-offset-2">Before You Say Yes</Link>.
      </p>
      <div className="mt-6">
        <PicksSignupFromUrl back="/interview-prep" source="interview-prep" compact />
      </div>
    </div>
  );
}
