import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getOrderByResultsToken, getResultsCounts, newsletterProgress, paidRenewalOf } from "@/lib/sponsor";
import { daysBetween, phaseNote, runLine, runState, shortDay, sourceRows } from "@/lib/sponsor-results";
import { formatPrice, isRunning, sponsorPriceCents } from "@/lib/sponsor-form";
import { renewUrl } from "@/lib/sponsor-renew";
import { ResultsStats, RunMeter, SourcesTable } from "@/components/SponsorResults";
import { RewriteOwl } from "@/components/RewriteOwl";
import { fastTrackState, type FastTrackConfig } from "@/lib/fast-track";
import { sendResults } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your results · Braun Board",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ sent?: string; err?: string }> };

const n = (x: number) => x.toLocaleString("en-US");

const ERRORS: Record<string, string> = {
  number: "Use whole numbers for applications and interviews.",
  empty: "Fill in at least one box before sending.",
  save: "That didn't go through. Try again, or just email me.",
};

export default async function ResultsPage({ params, searchParams }: Props) {
  const { token } = await params;
  const sp = await searchParams;
  const o = await getOrderByResultsToken(token);
  if (!o) notFound();

  const [counts, renewal, ft, nl] = await Promise.all([
    getResultsCounts(o.id),
    paidRenewalOf(o.id),
    fastTrackState(o as typeof o & FastTrackConfig).catch(() => null),
    newsletterProgress(o.report_newsletter_campaign),
  ]);
  const rows = sourceRows(counts);
  const first = o.contact_name.trim().split(/\s+/)[0];
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://braunboard.com").replace(/\/$/, "");
  const running = isRunning(o);
  const price = sponsorPriceCents();
  const answered = o.client_results_at != null;

  const channels: [string, string][] = [
    ["Featured on the Braun Board home page", running && o.ends_at ? `Live until ${shortDay(new Date(o.ends_at))}` : runLine(o.live_at, o.ends_at)],
    [
      "LinkedIn post",
      o.report_linkedin_impressions != null
        ? [
            `${n(o.report_linkedin_impressions)} impressions`,
            o.report_linkedin_reactions != null && `${n(o.report_linkedin_reactions)} reactions`,
            o.report_linkedin_comments != null && `${n(o.report_linkedin_comments)} comments`,
            o.report_linkedin_clicks != null && `${n(o.report_linkedin_clicks)} clicks`,
          ]
            .filter(Boolean)
            .join(" · ")
        : "Numbers show up here after it runs",
    ],
    [
      "My newsletter",
      nl
        ? nl.finished || nl.sent >= nl.total
          ? `Sent to ${n(nl.total)} subscribers`
          : `Going out to ${n(nl.total)} subscribers · ${n(nl.sent)} sent so far`
        : o.report_newsletter_sent != null
          ? `Sent to ${n(o.report_newsletter_sent)} subscribers`
          : "Numbers show up here after it goes out",
    ],
  ];
  if (o.report_braunboard_email_sent != null) {
    channels.push(["Braun Board email", `Sent to ${n(o.report_braunboard_email_sent)} subscribers`]);
  }

  const nlSent = nl ? nl.sent : (o.report_newsletter_sent ?? 0);
  const reach = o.views + (o.report_linkedin_impressions ?? 0) + nlSent + (o.report_braunboard_email_sent ?? 0);
  const reachText = reach >= 1000 ? `about ${n(Math.round(reach / 100) * 100)}` : n(reach);
  const days = o.live_at ? daysBetween(new Date(o.live_at), o.ends_at && !running ? new Date(o.ends_at) : new Date()) + 1 : 0;
  const ftClaimed = ft ? ft.total - ft.left : 0;
  const ftMinutes = (o as FastTrackConfig).fast_track_minutes ?? 25;
  const summary = [
    `your job has shown up ${reachText} times`,
    `${n(o.apply_clicks)} ${o.apply_clicks === 1 ? "person" : "people"} clicked Apply`,
    ft && ftClaimed > 0 && (ftClaimed >= ft.total ? `all ${ft.total} Fast Track codes are claimed` : `${ftClaimed} of ${ft.total} Fast Track codes are claimed`),
  ].filter(Boolean) as string[];
  const run = runState(o.live_at, o.ends_at);
  const note = phaseNote(run, !!nl && !nl.finished && nl.sent < nl.total);
  const summaryText = summary.length > 1 ? `${summary.slice(0, -1).join(", ")}, and ${summary.at(-1)}` : summary[0];

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="relative mt-16 rounded-2xl border border-line bg-surface p-5 sm:p-7">
        <RewriteOwl className="absolute -top-[60px] right-6 h-[64px] w-[96px]" />
        <div className="flex items-center gap-3">
          <Image src="/josh-braun.png" alt="Josh Braun" width={56} height={56} className="h-14 w-14 rounded-full" priority />
          <div>
            <p className="text-[17px] font-semibold">Hi {first},</p>
            <p className="text-sm text-ink-2">From Josh Braun</p>
          </div>
        </div>
        <p className="mt-4 text-sm font-semibold text-accent">{o.job_title}</p>
        <p className="mt-2 text-xl font-bold leading-snug tracking-tight">
          {days > 0 ? `In ${days} ${days === 1 ? "day" : "days"}, ` : ""}
          {summaryText}.
        </p>
        <div className="mt-4">{run ? <RunMeter {...run} /> : <p className="text-sm font-semibold text-ink-2">{runLine(o.live_at, o.ends_at)}</p>}</div>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">These numbers update on their own, so check back anytime.</p>
      </div>

      {ft && ftClaimed > 0 && (
        <section className="rounded-2xl border-2 border-accent bg-accent-soft p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-accent">Fast Track</p>
          <p className="mt-1 text-lg font-bold leading-snug">
            {ftClaimed} {ftClaimed === 1 ? "person is" : "people are"} getting a guaranteed {ftMinutes}-minute screening call with you.
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
            Look for codes BB-FT1 to BB-FT{ft.total} on applications.
            {ftClaimed >= ft.total ? ` All ${ft.total} are claimed.` : ` ${ft.left} still open.`}
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-lg font-bold tracking-tight">Where your job has been</h2>
        <ul className="mt-3 space-y-3">
          {channels.map(([k, v]) => (
            <li key={k} className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
              <span className="font-semibold">{k}</span>
              <span className="text-ink-2 sm:text-right">{v}</span>
            </li>
          ))}
        </ul>
      </section>

      <ResultsStats views={o.views} clicks={o.apply_clicks} applications={o.client_applications ?? null} interviews={o.client_interviews ?? null} />

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-lg font-bold tracking-tight">Where people came from</h2>
        <p className="mt-1 text-sm text-ink-2">How people found your job page.</p>
        <SourcesTable rows={rows} showClicks={false} />
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-wide text-ink-3">A note from me</p>
        <p className="mt-2 text-[17px] leading-relaxed text-ink">{note}</p>
        <Image src="/josh-signature.png" alt="Josh" width={640} height={320} className="-ml-1 mt-1 h-auto w-[130px]" />
      </section>

      <section id="yours" className="scroll-mt-20 rounded-2xl border border-amber/40 bg-surface p-5">
        <h2 className="text-lg font-bold tracking-tight">How&apos;s it going on your end?</h2>
        <p className="mt-1 text-[15px] leading-relaxed text-ink-2">
          I can see who clicks Apply. What happens after that lives in your system. Mind sharing? It helps me send you better people.
        </p>
        {sp.sent && <p className="mt-3 rounded-lg bg-accent-soft px-3 py-2 text-sm font-semibold text-accent">Got it, thank you. I just got your numbers.</p>}
        {sp.err && ERRORS[sp.err] && <p className="mt-3 rounded-lg bg-amber-soft px-3 py-2 text-sm font-semibold text-amber">{ERRORS[sp.err]}</p>}
        <form action={sendResults} className="mt-4 space-y-3">
          <input type="hidden" name="token" value={token} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              Applications so far
              <input
                name="applications"
                inputMode="numeric"
                defaultValue={o.client_applications ?? ""}
                className="mt-1 block w-full rounded-lg border border-line-strong bg-bg px-3 py-2 text-[15px] font-normal"
              />
            </label>
            <label className="block text-sm font-semibold">
              Interviews so far
              <input
                name="interviews"
                inputMode="numeric"
                defaultValue={o.client_interviews ?? ""}
                className="mt-1 block w-full rounded-lg border border-line-strong bg-bg px-3 py-2 text-[15px] font-normal"
              />
            </label>
          </div>
          <label className="block text-sm font-semibold">
            Anything else? <span className="font-normal text-ink-3">(optional)</span>
            <textarea
              name="note"
              rows={3}
              maxLength={2000}
              defaultValue={o.client_results_note ?? ""}
              placeholder="Quality of applicants, anyone you're excited about, what you'd change..."
              className="mt-1 block w-full rounded-lg border border-line-strong bg-bg px-3 py-2 text-[15px] font-normal"
            />
          </label>
          <button type="submit" className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
            {answered ? "Update and send to Josh" : "Send to Josh"}
          </button>
        </form>
      </section>

      {renewal ? (
        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-lg font-bold tracking-tight">You&apos;re renewed</h2>
          <p className="mt-1 text-[15px] text-ink-2">Another 30 days is lined up. Thanks for sticking with me.</p>
        </section>
      ) : (
        o.status === "live" && (
          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-lg font-bold tracking-tight">Need more time?</h2>
            <p className="mt-1 text-[15px] leading-relaxed text-ink-2">
              If the role&apos;s still open, you can run it another 30 days{price ? ` for ${formatPrice(price)}` : ""}. Same package: the featured card, a LinkedIn post, and a newsletter send.
            </p>
            {running && (
              <a href={renewUrl(site, o.id)} className="mt-3 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
                Renew for 30 more days
              </a>
            )}
          </section>
        )
      )}

      <p className="pb-6 text-center text-sm text-ink-3">
        Questions? Call or text me at{" "}
        <a href="tel:+19546950844" className="font-semibold text-ink underline underline-offset-2">
          954-695-0844
        </a>{" "}
        or email{" "}
        <a href="mailto:josh@braunboard.com" className="font-semibold text-ink underline underline-offset-2">
          josh@braunboard.com
        </a>
        .
      </p>
    </div>
  );
}
