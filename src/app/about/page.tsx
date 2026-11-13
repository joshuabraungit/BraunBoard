import type { Metadata } from "next";
import Link from "next/link";
import { jsonLd } from "@/lib/job-schema";

// The plain "what is this" page. Written so a person, Google, ChatGPT or Claude can each
// get a straight answer about Braun Board in one sentence.
export const metadata: Metadata = {
  alternates: { canonical: "/about" },
  title: "What is Braun Board? About and FAQ · Braun Board",
  description:
    "Braun Board is a job board just for B2B sales jobs, run by sales trainer Josh Braun. Every job shows the pay, what you'd sell, who you'd sell to, and what the posting leaves out.",
};

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.braunboard.com";

type QA = { q: string; a: string; link?: { href: string; label: string } };

const FAQ: QA[] = [
  {
    q: "What is Braun Board?",
    a: "Braun Board is a job board just for B2B sales jobs. Every job shows the pay (and whether it's base or OTE), what you'd sell in plain English, who you'd sell to, and what the posting leaves out.",
  },
  {
    q: "Who runs Braun Board?",
    a: "Me, Josh Braun. I'm a sales trainer. I used to hire salespeople, and I was the first outbound sales hire at Jellyvision. It's just me, so if something looks off, call or text me at 954-695-0844. Yes, that's my real number.",
  },
  {
    q: "Is Braun Board free?",
    a: "Yes. Browsing jobs, the salary pages and the Toolkit are free. Signing in is free too, and it unlocks saved jobs, job alerts and the résumé tools.",
  },
  {
    q: "Where do the jobs come from?",
    a: "Straight from company careers pages on Greenhouse, Lever, Ashby and Workable. Each company gets checked about every four hours. When a company takes a job down, it comes off Braun Board too.",
  },
  {
    q: "What kinds of sales jobs are on Braun Board?",
    a: "Quota-carrying B2B sales roles: SDRs and BDRs, account executives, account managers, sales managers, sales directors, VPs of sales, and partnerships and channel roles. No medical device or clinical roles.",
  },
  {
    q: "Which countries does Braun Board cover?",
    a: "The US, Canada, the UK and Germany (English-language postings only), plus remote roles open across Europe.",
  },
  {
    q: "How is Braun Board different from LinkedIn Jobs or Indeed?",
    a: "It only lists B2B sales jobs, and it reads each posting for the things sellers ask about: base vs. OTE, what you'd sell, who you'd sell to, new business vs. account growth, how long the job's been open, and, when I know it, the percent of reps who hit OTE. Each job also gets red, yellow and green lights for what the posting says and what it skips.",
  },
  {
    q: "What do the red, yellow and green lights mean?",
    a: "A quick read on the posting. Green means it tells you something useful, like the pay. Yellow is something to know before you apply, like a long sales cycle or missing quota details. Red means something important is missing, like no pay at all.",
  },
  {
    q: "What is Braun's Picks?",
    a: "Five sales jobs I think are worth a look, sent to your inbox every Tuesday. Free.",
    link: { href: "/picks", label: "Get Braun's Picks" },
  },
  {
    q: "What is 3-2-1 Interview Prep?",
    a: "Interview prep short enough to remember without notes: 3 numbers to know, 2 stories to tell, 1 question to ask. Built from your résumé, with nothing made up.",
    link: { href: "/interview-prep", label: "Try 3-2-1 Interview Prep" },
  },
  {
    q: "I'm hiring. How do I get my job on Braun Board?",
    a: "If your jobs are on Greenhouse, Lever, Ashby or Workable, they're probably here already. To get in front of more sellers, including good ones who aren't looking, you can sponsor a job: $750 for 30 days on the home page, plus a LinkedIn post to my 289,000 followers and a newsletter send.",
    link: { href: "/employers", label: "Sponsor a job" },
  },
];

export default function AboutPage() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE}/#org`,
        name: "Braun Board",
        url: `${SITE}/`,
        description: "A job board just for B2B sales jobs, with the pay, what you'd sell, and what the posting leaves out.",
        founder: { "@type": "Person", name: "Josh Braun", url: "https://joshbraun.com/", sameAs: ["https://www.linkedin.com/in/josh-braun"] },
        telephone: "+1-954-695-0844",
        sameAs: ["https://www.reddit.com/r/BraunBoard/"],
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
      },
    ],
  };

  return (
    <div className="mx-auto max-w-2xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <p className="text-xs font-bold uppercase tracking-wide text-accent">About</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">What is Braun Board?</h1>
      <p className="mt-3 text-lg text-ink-2">
        A job board just for B2B sales jobs. Most job posts shout the OTE and go quiet on everything else. So every job here shows the pay, what you&apos;d
        sell, who you&apos;d sell to, and what the posting leaves out.
      </p>

      <div className="mt-10 divide-y divide-line border-y border-line">
        {FAQ.map(({ q, a, link }) => (
          <section key={q} className="py-6">
            <h2 className="text-lg font-bold tracking-tight">{q}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{a}</p>
            {link && (
              <p className="mt-2 text-[15px]">
                <Link href={link.href} className="font-semibold text-ink underline underline-offset-2">
                  {link.label} →
                </Link>
              </p>
            )}
          </section>
        ))}
      </div>

      <div className="mt-12 rounded-2xl bg-ink p-6 text-white sm:p-8">
        <h2 className="text-xl font-bold tracking-tight">Have a look around</h2>
        <p className="mt-1 text-white/75">No sign-up needed to browse.</p>
        <Link href="/jobs" className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-white px-5 text-sm font-semibold text-ink hover:opacity-90">
          Browse sales jobs →
        </Link>
      </div>
    </div>
  );
}
