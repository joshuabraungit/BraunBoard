import type { Metadata } from "next";
import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { PicksSignup } from "@/components/PicksSignup";
import { PlaybookTabs } from "@/components/PlaybookTabs";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  alternates: { canonical: "/cold-call" },
  title: "Cold call talk track · Call the hiring manager · Braun Board",
  description:
    "A cold call talk track for sales job seekers to call the hiring manager directly: the opener, the question, how to handle “just apply online” and “I'm busy,” and a voicemail that gives them something useful.",
};

type Step = { label: string; lines: string[]; branches?: [string, string][]; why: string };

const STEPS: Step[] = [
  {
    label: "Opener",
    lines: ["Hi Max, it's Alex Berger. We haven't spoken before and I know you weren't expecting my call, but I was hoping you could help me out for a moment."],
    why: "Admitting he wasn't expecting you lowers his guard. Asking for help, not his time, makes it easy to say yes.",
  },
  {
    label: "Reason",
    lines: ["I saw you're hiring an AE to help move beyond founder-led sales. I applied. And I figured the best way to show you how I'd sound with your buyers was to just pick up the phone."],
    why: "Opens with something from his job post, then names what's really happening: this call is the work sample.",
  },
  {
    label: "Question",
    lines: ["When you've got a stack of candidates who look the same on paper, how do you decide who gets a first conversation?"],
    why: "Gets him talking about what he values. Listen, then connect what he says to one piece of your proof, briefly.",
  },
  {
    label: "Ask",
    lines: ["Would it make sense to set up a time to talk, or is it better if I wait for the process?"],
    why: "Gives him two real options. No pressure, so he can actually choose.",
  },
];

const OBJECTIONS: Step[] = [
  {
    label: "“Just apply online”",
    lines: ["Sounds like you get a lot of these calls.", "(pause)", "How'd I do handling this objection?"],
    branches: [
      ["If he's positive", "I appreciate that. Would it be worth setting up a time to talk?"],
      ["If he gives feedback", "That's really helpful, thank you. If I came in with that sorted, would you be open to a first conversation?"],
      ["If he still says apply", "Will do. Mind if I mention we spoke, so it doesn't get lost in the pile?"],
    ],
    why: "The label agrees with his world, so there's nothing to push back on. Naming it an objection shows you know exactly what just happened, which is the skill he's hiring for. And it turns a gatekeeper into a coach.",
  },
  {
    label: "“I'm busy”",
    lines: ["Okay. I'll call you back."],
    why: "Every other caller tries to squeeze in a pitch. You just let go. Calm and confident, and the next call starts warmer.",
  },
];

const VOICEMAIL =
  "Hi Max, it's Alex Berger. Saw in your job ad that you're moving beyond founder-led sales. Two things helped us at Acme that I wanted to bounce off you. I'll send a short note too. My number is 555-555-5555. Again, 555-555-5555.";

const FULL_TRACK = [
  ...STEPS.map((s) => `${s.label.toUpperCase()}\n${s.lines.join("\n")}`),
  ...OBJECTIONS.map((o) => `IF HE SAYS ${o.label.toUpperCase()}\n${o.lines.join("\n")}${o.branches ? "\n" + o.branches.map(([w, l]) => `${w}: ${l}`).join("\n") : ""}`),
  `VOICEMAIL\n${VOICEMAIL}`,
].join("\n\n");

function Card({ step, n }: { step: Step; n?: number }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-accent">
        {n ? `${n}. ` : ""}
        {step.label}
      </p>
      <div className="mt-2 space-y-2">
        {step.lines.map((l) =>
          l === "(pause)" ? (
            <p key={l} className="text-sm italic text-ink-3">(pause)</p>
          ) : (
            <p key={l} className="text-[17px] font-medium leading-relaxed">&ldquo;{l}&rdquo;</p>
          ),
        )}
      </div>
      {step.branches && (
        <ul className="mt-4 space-y-3 border-l-2 border-line pl-4">
          {step.branches.map(([when, line]) => (
            <li key={when}>
              <p className="text-sm font-semibold text-ink-2">{when}</p>
              <p className="text-[15px] leading-relaxed">&ldquo;{line}&rdquo;</p>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 rounded-lg bg-bg px-3 py-2.5 text-[15px] leading-relaxed text-ink-2">
        <span className="font-semibold text-ink">Why it works:</span> {step.why}
      </p>
    </div>
  );
}

export default async function ColdCallPage({ searchParams }: { searchParams: Promise<{ picks?: string }> }) {
  const { picks } = await searchParams;
  return (
    <div className="mx-auto max-w-2xl">
      <PlaybookTabs active="/cold-call" />

      <p className="text-xs font-bold uppercase tracking-wide text-accent">Cold call talk track</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Call the hiring manager.</h1>
      <p className="mt-2 text-lg text-ink-2">
        An email shows you can write. A call shows you can do the job, live, with the person who&apos;d manage you.
      </p>

      <div className="mt-6 rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-bold">Before you dial</h2>
        <ul className="mt-3 space-y-2 text-[15px]">
          {[
            "Call the hiring manager, not the recruiter.",
            "If the posting says not to call, don't.",
            "Have one piece of proof ready, in one sentence.",
          ].map((t) => (
            <li key={t} className="flex gap-2.5">
              <span aria-hidden="true" className="font-bold text-accent">✓</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-bold tracking-tight">Check your intent</h2>
        <div className="mt-3 space-y-3 text-[17px] leading-relaxed">
          <p>Your intent shapes how you sound.</p>
          <p>When you need the job, you sound like it. Rushed. Nervous. Pushy.</p>
          <p>The hiring manager hears it in the first five seconds.</p>
          <p className="font-semibold">So lean back.</p>
          <p>Make the call to see if there&apos;s a fit, not to get a yes.</p>
          <p>
            When you&apos;re not attached to what happens, your voice changes. You slow down. You sound relaxed. You sound like someone
            who&apos;s done this before.
          </p>
          <p>Detached doesn&apos;t mean you don&apos;t care.</p>
          <p className="font-semibold">It means you do your best and forget the rest.</p>
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-xl font-bold tracking-tight">The call</h2>
          <CopyButton text={FULL_TRACK} label="Copy the whole track" className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold hover:border-line-strong" />
        </div>
        <div className="mt-4 space-y-4">
          {STEPS.map((s, i) => (
            <Card key={s.label} step={s} n={i + 1} />
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold tracking-tight">When he pushes back</h2>
        <div className="mt-4 space-y-4">
          {OBJECTIONS.map((o) => (
            <Card key={o.label} step={o} />
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold tracking-tight">If you get voicemail</h2>
        <div className="mt-4 rounded-2xl border border-line bg-surface p-5">
          <p className="text-[17px] font-medium leading-relaxed">&ldquo;{VOICEMAIL}&rdquo;</p>
          <p className="mt-4 rounded-lg bg-bg px-3 py-2.5 text-[15px] leading-relaxed text-ink-2">
            <span className="font-semibold text-ink">Why it works:</span> It&apos;s about his problem, not your application. &ldquo;Two
            things&rdquo; makes him curious, and &ldquo;bounce off you&rdquo; treats him like a peer. Say your number twice. Then make
            sure your note names the two things.
          </p>
        </div>
      </section>

      <p className="mt-10 text-[15px] text-ink-2">
        Need the note to send after?{" "}
        <Link href="/outreach" className="font-semibold text-ink underline underline-offset-2">See the cold emails</Link>.
      </p>
      <div className="mt-6">
        <PicksSignup back="/cold-call" source="cold-call" status={picks} compact />
      </div>
    </div>
  );
}
