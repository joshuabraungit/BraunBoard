import type { Metadata } from "next";
import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { PicksSignupFromUrl } from "@/components/PicksSignupFromUrl";
import { PlaybookTabs } from "@/components/PlaybookTabs";
import { WhyThisWayOpen } from "@/components/WhyThisWay";
import { toolsPublic } from "@/lib/job-tools/gate";

export const metadata: Metadata = {
  alternates: { canonical: "/before-you-apply" },
  title: "Before You Apply · Find out where you fit · Braun Board",
  description:
    "Most résumé tools try to make you look like a match. This helps you find out if you are one: where you're strong, where you might be, and where you're not. Nothing made up, no score.",
};

const PROMPT = `I'm thinking about applying for the job below. Before you rewrite anything, help me figure out if I'm actually a fit.

1. Where I'm strong: what the job needs that my résumé clearly shows.
2. Worth exploring: what the job wants that my résumé hints at without making clear.
3. Possible gaps: what the job requires that nothing on my résumé shows.

Then ask me up to 3 questions about the things in 2 and 3. Ask whether I've done them and just didn't write them down. Don't assume I have.

Rules:
- Use only what my résumé and my answers say. Never add a skill, tool, title, number or result I didn't give you.
- No match score or percentage.
- If the core of the job is something I haven't done, tell me plainly. That's useful to know.

After I answer, ask if I want a version of my résumé that makes my relevant experience easier to see, in the job's words. If yes, show each change as my original line, the rewrite, and the phrase from the job it matches.

Job description:
[paste]

My résumé:
[paste]`;

const YOU_GET: [string, string][] = [
  ["Where you're strong", "What the job needs that your résumé already shows."],
  ["Worth exploring", "What you might have that your résumé doesn't make clear."],
  ["Possible gaps", "What the job requires that nothing on your résumé shows."],
  ["Questions, not guesses", "A few questions before anything gets rewritten. Plenty of people have done the thing and never wrote it down."],
  ["A résumé that shows it, if you want one", "Your real experience in their words. You approve every change."],
];

export default function BeforeYouApplyPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PlaybookTabs active="/before-you-apply" />

      <p className="text-xs font-bold uppercase tracking-wide text-accent">Before You Apply</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Find out where you fit. And where you don&apos;t.</h1>

      <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-xl font-bold tracking-tight">Why I built it this way</h2>
        <div className="mt-2">
          <WhyThisWayOpen builtIn={toolsPublic()} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold tracking-tight">What you get</h2>
        <ol className="mt-4 space-y-3">
          {YOU_GET.map(([t, d], i) => (
            <li key={t} className="flex gap-3">
              <span className="mt-0.5 font-serif text-xl font-bold leading-none text-accent">{i + 1}</span>
              <div>
                <p className="font-semibold">{t}</p>
                <p className="text-[15px] text-ink-2">{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {toolsPublic() && (
        <Link href="/jobs" className="mt-8 flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-5 hover:border-line-strong">
          <span>
            <span className="block font-semibold">On Braun Board, it&apos;s built in</span>
            <span className="block text-sm text-ink-2">Add your résumé once. Every job has a Before You Apply box. No pasting.</span>
          </span>
          <span className="shrink-0 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white">Find a job →</span>
        </Link>
      )}

      <section id="prompt" className="mt-12 scroll-mt-24">
        <h2 className="text-xl font-bold tracking-tight">Or use the prompt</h2>
        <p className="mt-1 text-[15px] text-ink-2">Works in Claude, ChatGPT or any AI. Paste the job description and your résumé where it says [paste].</p>
        <div className="mt-4 rounded-2xl border border-line bg-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold">Before You Apply</p>
            <CopyButton text={PROMPT} label="Copy prompt" className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:opacity-90" />
          </div>
          <pre className="mt-3 max-h-80 overflow-y-auto whitespace-pre-wrap rounded-xl bg-bg p-4 font-sans text-sm leading-relaxed text-ink-2">{PROMPT}</pre>
        </div>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-2">
          <span className="font-semibold text-ink">The test:</span> could you talk about every line on your résumé for two minutes in an interview? If not, it
          doesn&apos;t belong there.
        </p>
      </section>

      <p className="mt-10 text-[15px] text-ink-2">
        Decided it&apos;s a fit? Give the hiring manager something nobody else sends.{" "}
        <Link href="/proof-page" className="font-semibold text-ink underline underline-offset-2">Build a proof page</Link>. Got an offer?{" "}
        <Link href="/kit" className="font-semibold text-ink underline underline-offset-2">Before You Say Yes</Link>.
      </p>
      <div className="mt-6">
        <PicksSignupFromUrl back="/before-you-apply" source="before-you-apply" compact />
      </div>
    </div>
  );
}
