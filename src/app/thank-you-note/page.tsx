import type { Metadata } from "next";
import Link from "next/link";
import { PicksSignupFromUrl } from "@/components/PicksSignupFromUrl";
import { PlaybookTabs } from "@/components/PlaybookTabs";

export const metadata: Metadata = {
  alternates: { canonical: "/thank-you-note" },
  title: "Thank-you note · What to send after the interview · Braun Board",
  description:
    "Skip the thank-you note they've read 300 times. Ask one real question in the interview, then write about their answer. See an example and why it works.",
};

const QUESTIONS = [
  "What did you learn from your worst quarter?",
  "What does your top rep do that everyone else doesn't?",
  "What would make someone struggle here in the first 90 days?",
];

const WHY: [string, string][] = [
  ["It quotes him", "Hearing your own words back is proof someone listened. Most of us rarely get that."],
  [
    "It matches his honesty",
    "Tom admitted something human. Dana admitted something too. Now it feels like two people talking, not a candidate and a gatekeeper.",
  ],
  ["It makes him smile", "The P.S. winks at how stiff these notes usually are. People remember how you made them feel."],
  ["It couldn't go to anyone else", "That's the whole trick. Swap in another name and the note stops making sense."],
];

const SHAPE: [string, string][] = [
  ["Skip the usual line", "Or name it and move on. “This is the part where I say thanks for your time.”"],
  ["Quote them", "The one thing they said that stuck with you. Their exact words."],
  ["Say what it meant to you", "Something true. A time you did the same thing works great."],
  ["Thank them for something specific", "Not their time. The thing they gave you."],
  ["Add a P.S. if you want", "A little levity. Optional, and it's the part they'll remember."],
];

export default function ThankYouNotePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PlaybookTabs active="/thank-you-note" />

      <p className="text-xs font-bold uppercase tracking-wide text-accent">Thank-you note</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Send a note they&apos;ll actually remember.</h1>
      <p className="mt-2 text-lg text-ink-2">
        After the interview, skip the &ldquo;Thank you for your time, I&apos;m excited about the opportunity&rdquo; note. They&apos;ve read
        that one 300 times this month.
      </p>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
        <span className="font-semibold text-ink">Why it matters:</span> their brain skims the usual note like a terms of service page.
        A note about something they said gets read.
      </p>

      <section className="mt-10">
        <h2 className="text-xl font-bold tracking-tight">It starts in the interview</h2>
        <p className="mt-1 text-[15px] leading-relaxed text-ink-2">
          Ask one real question. Then listen for the answer you can&apos;t stop thinking about. Write their exact words down right after.
        </p>
        <ul className="mt-4 space-y-2">
          {QUESTIONS.map((q) => (
            <li key={q} className="rounded-xl border border-line bg-surface px-4 py-3 text-[15px] font-semibold">
              &ldquo;{q}&rdquo;
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-bold tracking-tight">An example</h2>
        <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink-2">
          <p>Dana had a final round with a sales VP named Tom.</p>
          <p>
            She asked: <span className="font-semibold text-ink">&ldquo;What did you learn from your worst quarter?&rdquo;</span>
          </p>
          <p>
            Tom laughed and said: <span className="font-semibold text-ink">&ldquo;That I was forecasting with my heart.&rdquo;</span>
          </p>
          <p>That night, Dana sent this:</p>
        </div>

        <div className="mt-4 rounded-2xl border border-line bg-surface p-6 text-[15px] leading-relaxed">
          <p>Hi Tom,</p>
          <p className="mt-3">I&apos;m supposed to keep this short and professional. Let&apos;s see how long that lasts.</p>
          <p className="mt-3">&ldquo;Forecasting with my heart.&rdquo; I wrote it on a sticky note and stuck it on my monitor.</p>
          <p className="mt-3">I&apos;ve done the same thing. A deal felt great, so I called it. It was not great.</p>
          <p className="mt-3">Thanks for being that honest in an interview. It made it easy to be honest back.</p>
          <p className="mt-3">Dana</p>
          <p className="mt-3 text-ink-2">P.S. Lasted about two lines.</p>
        </div>
        <p className="mt-4 text-[15px] text-ink-2">Is it a little weird? Yeah. Will Tom remember Dana? Also yeah.</p>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-bold tracking-tight">Why it works</h2>
        <ol className="mt-4 space-y-3">
          {WHY.map(([title, desc], i) => (
            <li key={title} className="flex gap-3">
              <span className="mt-0.5 font-serif text-xl font-bold leading-none text-accent">{i + 1}</span>
              <div>
                <p className="font-semibold">{title}</p>
                <p className="text-[15px] leading-relaxed text-ink-2">{desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-bold tracking-tight">Write your own</h2>
        <div className="mt-4 rounded-2xl border border-line bg-surface p-5">
          <ol className="space-y-3">
            {SHAPE.map(([title, desc], i) => (
              <li key={title} className="flex gap-3">
                <span className="mt-0.5 font-serif text-xl font-bold leading-none text-accent">{i + 1}</span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-[15px] leading-relaxed text-ink-2">{desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="mt-4 rounded-xl bg-amber-soft px-4 py-3 text-[15px] leading-relaxed text-amber">
          <p>
            <span className="font-semibold">Keep it short:</span> under 100 words, sent the same day. No pitch, no recap of your résumé.
            One thing they said, and what it meant to you.
          </p>
        </div>
      </section>

      <p className="mt-10 text-[15px] text-ink-2">
        Haven&apos;t sent a proof page yet?{" "}
        <Link href="/proof-page" className="font-semibold text-ink underline underline-offset-2">Build one first</Link>. Offer on the way?{" "}
        <Link href="/kit" className="font-semibold text-ink underline underline-offset-2">Read Before You Say Yes</Link>.
      </p>
      <div className="mt-6">
        <PicksSignupFromUrl back="/thank-you-note" source="thank-you-note" compact />
      </div>
    </div>
  );
}
