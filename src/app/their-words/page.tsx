import type { Metadata } from "next";
import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { PicksSignupFromUrl } from "@/components/PicksSignupFromUrl";
import { PlaybookTabs } from "@/components/PlaybookTabs";

export const metadata: Metadata = {
  alternates: { canonical: "/their-words" },
  title: "Say it in their words · Your résumé in the language of the job · Braun Board",
  description:
    "A prompt that rewrites your résumé in the words the hiring manager uses, without adding anything that isn't true. Copy it into any AI.",
};

const PROMPT = `I'm applying for the job below. Help me describe my real experience using the words this company uses.

First, read the job description and list the phrases they repeat. That tells you what they care about most.

Then go through my résumé line by line. Where I did something they care about and described it in different words, suggest a rewrite in their language.

Rules:
- Never add a skill, tool, title, or number I didn't give you.
- If a line needs a number and I didn't give one, ask me. If I don't have one, leave it out.
- Don't make a small part of a job sound like the whole job.
- If they ask for something I don't have, tell me. Don't cover it up.

For each change, show me the original line, the rewrite, and the phrase from the job description it matches.

Finish with a short list of what they want that my résumé doesn't show. For each one, ask me whether I've done it and just didn't write it down.

Job description:
[paste]

My résumé:
[paste]`;

const FINE: string[] = [
  "You “built pipeline from scratch.” They call it “self-sourced new logos.” Same work, their words.",
  "You did the thing and never wrote it down. Now it's on the page.",
];

const NOT_FINE: string[] = [
  "Adding a skill or tool because the job asks for it",
  "Making up a number to fill a gap",
  "Stuffing in keywords that don't connect to anything you did",
  "Making a small part of a job sound like the whole job",
];

export default function TheirWordsPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PlaybookTabs active="/their-words" />

      <p className="text-xs font-bold uppercase tracking-wide text-accent">Say it in their words</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Your résumé, in the language of the job.</h1>
      <p className="mt-2 text-lg text-ink-2">Nothing added that isn&apos;t true.</p>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
        <span className="font-semibold text-ink">Why it matters:</span> hiring managers skim for the words in their own job post. If you
        did the work and described it differently, they can skim right past it.
      </p>
      <a href="#prompt" className="mt-3 inline-block text-[15px] font-semibold text-ink underline underline-offset-2">
        Skip to the prompt ↓
      </a>

      <section className="mt-10">
        <h2 className="text-xl font-bold tracking-tight">Change the words, never the facts</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="font-semibold">Fair game</p>
            <ul className="mt-2 space-y-2 text-[15px] text-ink-2">
              {FINE.map((t) => (
                <li key={t} className="flex gap-2.5">
                  <span aria-hidden="true" className="font-bold text-accent">✓</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="font-semibold">Not okay</p>
            <ul className="mt-2 space-y-2 text-[15px] text-ink-2">
              {NOT_FINE.map((t) => (
                <li key={t} className="flex gap-2.5">
                  <span aria-hidden="true" className="font-bold text-red">✕</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-2">
          <span className="font-semibold text-ink">The test:</span> could you talk about every line for two minutes in an interview? If an
          edit only works as long as nobody asks about it, cut it. It&apos;ll come out in the interview anyway.
        </p>
      </section>

      <section id="prompt" className="mt-12 scroll-mt-24">
        <h2 className="text-xl font-bold tracking-tight">The prompt</h2>
        <p className="mt-1 text-[15px] text-ink-2">Works in Claude, ChatGPT or any AI. Paste the job description and your résumé where it says [paste].</p>

        <div className="mt-4 rounded-2xl border border-line bg-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold">Say it in their words</p>
            <CopyButton text={PROMPT} label="Copy prompt" className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:opacity-90" />
          </div>
          <pre className="mt-3 max-h-80 overflow-y-auto whitespace-pre-wrap rounded-xl bg-bg p-4 font-sans text-sm leading-relaxed text-ink-2">{PROMPT}</pre>
        </div>

        <h3 className="mt-8 text-lg font-bold tracking-tight">What you get back</h3>
        <ol className="mt-3 space-y-4">
          {[
            ["What they care about", "The phrases the job repeats. Repetition tells you what matters most to them."],
            ["Your lines, side by side", "The original, the rewrite and the phrase it matches. You decide what to keep."],
            ["Questions, not guesses", "Where they want something your résumé doesn't show, it asks if you've done it. Plenty of people have and just never wrote it down."],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-3">
              <span className="mt-0.5 font-serif text-xl font-bold leading-none text-accent">{i + 1}</span>
              <div>
                <p className="font-semibold">{t}</p>
                <p className="text-[15px] leading-relaxed text-ink-2">{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <p className="mt-10 text-[15px] text-ink-2">
        Résumé in shape? Give the hiring manager something nobody else sends.{" "}
        <Link href="/proof-page" className="font-semibold text-ink underline underline-offset-2">Build a proof page</Link>.
      </p>
      <div className="mt-6">
        <PicksSignupFromUrl back="/their-words" source="their-words" compact />
      </div>
    </div>
  );
}
