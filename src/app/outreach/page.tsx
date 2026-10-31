import type { Metadata } from "next";
import Link from "next/link";
import { PicksSignupFromUrl } from "@/components/PicksSignupFromUrl";
import { PlaybookTabs } from "@/components/PlaybookTabs";
import { BeatsLegend, FirstNotes, FollowUps } from "./OutreachEmails";

export const metadata: Metadata = {
  alternates: { canonical: "/outreach" },
  title: "Cold emails · Reach the hiring manager, not just the ATS · Braun Board",
  description:
    "Four first notes and four follow-ups for sales job seekers to send the person who owns the hire, with subject lines, LinkedIn versions and the psychology behind each one.",
};

export default async function OutreachPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PlaybookTabs active="/outreach" />

      <p className="text-xs font-bold uppercase tracking-wide text-accent">Cold emails</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Stop applying. Start prospecting.</h1>
      <p className="mt-2 text-lg text-ink-2">
        Four first notes and four follow-ups for reaching the person who owns the hire. Plus why each one works, so you can write your own.
      </p>

      <section className="mt-10">
        <h2 className="text-xl font-bold tracking-tight">Every note has four beats</h2>
        <p className="mt-1 text-[15px] text-ink-2">Same structure you&apos;d use on a buyer. Colors match the emails below.</p>
        <div className="mt-4">
          <BeatsLegend />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold tracking-tight">The first note</h2>
        <p className="mb-4 mt-1 text-[15px] text-ink-2">Pick the one that fits where you are.</p>
        <FirstNotes />
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-bold tracking-tight">The follow-ups</h2>
        <p className="mb-4 mt-1 text-[15px] text-ink-2">Every touch adds something new. None of them say &ldquo;just checking in.&rdquo;</p>
        <FollowUps />
        <p className="mt-6 text-[15px] text-ink-2">
          Rather pick up the phone?{" "}
          <Link href="/cold-call" className="font-semibold text-ink underline underline-offset-2">See the cold call talk track</Link>.
        </p>
      </section>

      <div className="mt-12 rounded-2xl bg-ink p-6 text-white sm:p-8">
        <h2 className="text-xl font-bold tracking-tight">Find your observation</h2>
        <p className="mt-1 text-white/75">Every sales job on Braun Board shows what the posting says and what it leaves out. That&apos;s where your first line comes from.</p>
        <Link href="/jobs" className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-white px-5 text-sm font-semibold text-ink hover:opacity-90">
          Browse sales jobs →
        </Link>
      </div>

      <p className="mt-10 font-semibold">Got the interview? Ask better questions before you say yes.</p>
      <p className="mt-1 text-[15px] text-ink-2">
        <Link href="/kit?from=outreach" className="font-semibold text-ink underline underline-offset-2">Get the free interview kit</Link>, or get
        sales jobs worth reaching out about every Tuesday:
      </p>
      <div className="mt-3">
        <PicksSignupFromUrl back="/outreach" source="outreach" compact />
      </div>
    </div>
  );
}
