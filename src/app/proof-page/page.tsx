import type { Metadata } from "next";
import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { PicksSignup } from "@/components/PicksSignup";
import { PlaybookTabs } from "@/components/PlaybookTabs";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  alternates: { canonical: "/proof-page" },
  title: "Proof page · A one-page case for the hiring manager · Braun Board",
  description:
    "Send the hiring manager a page built just for their team: why them, your proof, five accounts you'd go after and your first 90 days. See an example, then copy the prompt to build your own.",
};

const PROMPT = `I'm applying for a sales role and want a one-page website to send the hiring manager. Build it as an artifact so I can publish it and share the link.

Rules
- Use only the facts I give you. Never invent numbers, results, companies or experience.
- Only use testimonials I paste, word for word. Never write, edit or shorten a quote.
- If something's missing, ask me before you build. One question at a time.
- Anyone with the link can see this page. Include the contact info I give you, but never my home address or anything else private.

Here's what I have
- The job posting: [paste]
- The hiring manager's name: [name]
- My résumé: [paste]
- My best numbers (attainment, deal size, pipeline): [paste]
- Two or three testimonials, with each person's name and title: [paste]
- What I noticed about the company: [paste]
- How to reach me (email, phone, LinkedIn): [paste]
- A link to my headshot, if I have one online: [paste link]

Build the page in this order
1. A headline written to the hiring manager about their problem, not my job search.
2. Why this company, in two sentences, starting from what I noticed.
3. My proof: up to four numbers, no adjectives.
4. What others say: my testimonials, word for word, with name and title.
5. The work: five companies I'd target, each with a reason to reach out now. If you can search the web, research them. If not, ask me for them. Tell me where each reason came from so I can check it. Then write one sample email to one of them: short, curious, no pitch, ending with a question.
6. My first 90 days, in three steps.
7. A close with one ask, "Book 15 minutes," and an easy out, like "If it's not a fit, no hard feelings."

Put my contact info near the top and again at the bottom, so it's easy to reach me.

If I gave you a link to my headshot, show it at the top in a circle next to my name. If not, show my initials in a circle instead.

Make it clean, simple and mobile-friendly. Short enough to read in 60 seconds.`;

const SECTIONS: [string, string][] = [
  ["A headline written to them", "About their problem, not your job search."],
  ["Why this company", "Two sentences, starting from something you noticed."],
  ["Your proof", "Up to four numbers. No adjectives."],
  ["What others say", "Two or three real testimonials. Name and title, their exact words."],
  ["The work", "Five accounts you'd go after, why now, and the email you'd send one of them."],
  ["Your first 90 days", "Three steps, not a strategy deck."],
  ["One ask, with an easy out", "“Book 15 minutes.” And “if it's not a fit, no hard feelings.”"],
];

const READY = [
  "The job posting",
  "The hiring manager's name",
  "Your résumé",
  "Your best numbers: attainment, deal size, pipeline",
  "Two or three testimonials (LinkedIn recommendations work)",
  "One thing you noticed about the company",
  "Your email, phone and LinkedIn",
  "A link to a headshot that's already online (optional)",
];

export default async function ProofPage({ searchParams }: { searchParams: Promise<{ picks?: string }> }) {
  const { picks } = await searchParams;
  return (
    <div className="mx-auto max-w-2xl">
      <PlaybookTabs active="/proof-page" />

      <p className="text-xs font-bold uppercase tracking-wide text-accent">Proof page</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Send them a page built just for them.</h1>
      <p className="mt-2 text-lg text-ink-2">
        A proof page is a one-page website you send the hiring manager: why them, your numbers, and real work you&apos;ve already done for
        their team.
      </p>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
        <span className="font-semibold text-ink">Why it matters:</span> hundreds of people send a résumé. Almost nobody shows up having
        already done the job.
      </p>
      <a href="#prompt" className="mt-3 inline-block text-[15px] font-semibold text-ink underline underline-offset-2">
        Skip to the prompt ↓
      </a>

      <section className="mt-10">
        <h2 className="text-xl font-bold tracking-tight">What goes on the page</h2>
        <ol className="mt-4 space-y-3">
          {SECTIONS.map(([title, desc], i) => (
            <li key={title} className="flex gap-3">
              <span className="mt-0.5 font-serif text-xl font-bold leading-none text-accent">{i + 1}</span>
              <div>
                <p className="font-semibold">{title}</p>
                <p className="text-[15px] text-ink-2">{desc}</p>
              </div>
            </li>
          ))}
        </ol>
        <a
          href="/examples/proof-page.html"
          target="_blank"
          rel="noopener"
          className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-5 hover:border-line-strong"
        >
          <span>
            <span className="block text-xs font-bold uppercase tracking-wide text-ink-3">Example</span>
            <span className="mt-0.5 block font-semibold">Maya Torres for Toast, LA territory</span>
            <span className="block text-sm text-ink-2">A real job and real restaurants. The candidate is made up. With notes on why each section works.</span>
          </span>
          <span className="shrink-0 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white">See it →</span>
        </a>
      </section>

      <section id="prompt" className="mt-12 scroll-mt-24">
        <h2 className="text-xl font-bold tracking-tight">Make your own</h2>
        <p className="mt-1 text-[15px] text-ink-2">Copy this prompt into Claude. It builds the page and hosts it for you.</p>

        <div className="mt-4 rounded-2xl border border-line bg-surface p-5">
          <p className="font-semibold">Have these ready</p>
          <ul className="mt-2 space-y-1.5 text-[15px]">
            {READY.map((r) => (
              <li key={r} className="flex gap-2.5">
                <span aria-hidden="true" className="font-bold text-accent">✓</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 rounded-2xl border border-line bg-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold">The prompt</p>
            <CopyButton text={PROMPT} label="Copy prompt" className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:opacity-90" />
          </div>
          <pre className="mt-3 max-h-80 overflow-y-auto whitespace-pre-wrap rounded-xl bg-bg p-4 font-sans text-sm leading-relaxed text-ink-2">{PROMPT}</pre>
        </div>

        <h3 className="mt-8 text-lg font-bold tracking-tight">Then</h3>
        <ol className="mt-3 space-y-4">
          {[
            ["Paste it into Claude", "Go to claude.ai (a free account works), paste the prompt and fill in the brackets. Answer its questions."],
            ["Click “Publish”", "On the page Claude builds. It gives you a link anyone can open, no Claude account needed."],
            ["Hide the link behind your name", "In your email, link the words “Maya Torres for Toast LA” instead of pasting the raw URL. They see your name, not a messy link."],
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

        <div className="mt-6 rounded-2xl border border-line bg-surface p-5">
          <p className="font-semibold">Applying to more than one job?</p>
          <p className="mt-1 text-[15px] leading-relaxed text-ink-2">
            Build the base once. Your proof, testimonials and contact info stay the same. For the next job, ask Claude: &ldquo;Keep my
            proof, testimonials and contact info. Redo the headline, why this company, the five accounts and the 90 days for this new
            job,&rdquo; and paste the new posting. Your second page takes minutes, not an hour.
          </p>
        </div>

        <div className="mt-4 rounded-xl bg-amber-soft px-4 py-3 text-[15px] leading-relaxed text-amber">
          <p>
            <span className="font-semibold">Heads up:</span> anyone with the link can see the page, so only put on it what you&apos;d be glad
            for a hiring manager to read. Publishing works on personal Claude accounts, not company Team or Enterprise ones.
          </p>
        </div>
        <p className="mt-4 text-sm text-ink-2">
          Using ChatGPT or another AI? Save the page as index.html, put it in a folder and drag the folder onto Netlify Drop
          (app.netlify.com/drop). You&apos;ll need a free Netlify account to share it.
        </p>
      </section>

      <p className="mt-10 text-[15px] text-ink-2">
        Your page needs an email to ride along with.{" "}
        <Link href="/outreach" className="font-semibold text-ink underline underline-offset-2">See the cold emails</Link>.
      </p>
      <div className="mt-6">
        <PicksSignup back="/proof-page" source="proof-page" status={picks} compact />
      </div>
    </div>
  );
}
