import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getOrderByResultsToken, getResultsCounts, paidRenewalOf } from "@/lib/sponsor";
import { applyRate, runLine, sourceRows } from "@/lib/sponsor-results";
import { formatPrice, isRunning, sponsorPriceCents } from "@/lib/sponsor-form";
import { renewUrl } from "@/lib/sponsor-renew";
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

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">{label}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-3">{sub}</p>}
    </div>
  );
}

export default async function ResultsPage({ params, searchParams }: Props) {
  const { token } = await params;
  const sp = await searchParams;
  const o = await getOrderByResultsToken(token);
  if (!o) notFound();

  const [counts, renewal] = await Promise.all([getResultsCounts(o.id), paidRenewalOf(o.id)]);
  const rows = sourceRows(counts);
  const earlierClicks = Math.max(0, o.apply_clicks - counts.tracked_clicks);
  const rate = applyRate(o.views, o.apply_clicks);
  const first = o.contact_name.trim().split(/\s+/)[0];
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://braunboard.com").replace(/\/$/, "");
  const running = isRunning(o);
  const price = sponsorPriceCents();
  const answered = o.client_results_at != null;

  const channels: [string, string][] = [
    ["Featured card on the Braun Board home page", runLine(o.live_at, o.ends_at)],
    [
      "LinkedIn post",
      o.report_linkedin_impressions != null
        ? `${n(o.report_linkedin_impressions)} impressions${o.report_linkedin_clicks != null ? ` · ${n(o.report_linkedin_clicks)} clicks` : ""}`
        : "Numbers show up here after it runs",
    ],
    ["My newsletter", o.report_newsletter_sent != null ? `Sent to ${n(o.report_newsletter_sent)} subscribers` : "Numbers show up here after it goes out"],
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="rounded-2xl border border-line bg-surface p-5 sm:p-7">
        <div className="flex items-center gap-3">
          <Image src="/josh-braun.png" alt="Josh Braun" width={56} height={56} className="h-14 w-14 rounded-full" priority />
          <div>
            <p className="text-[17px] font-semibold">Hi {first},</p>
            <p className="text-sm text-ink-2">From Josh Braun</p>
          </div>
        </div>
        <p className="mt-4 text-[16px] leading-relaxed">
          Here&apos;s how your {o.job_title} post for {o.company} is doing. These numbers update on their own, so check back anytime.
        </p>
        <p className="mt-2 text-sm font-semibold text-accent">{runLine(o.live_at, o.ends_at)}</p>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label="Job page views" value={n(o.views)} />
        <Stat label="Apply clicks" value={n(o.apply_clicks)} sub="Clicks through to your application" />
        <Stat label="Apply rate" value={rate ?? "–"} sub="Apply clicks per view" />
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-lg font-bold tracking-tight">Where people came from</h2>
        <p className="mt-1 text-sm text-ink-2">Based on how each person first landed on Braun Board that day.</p>
        {rows.length ? (
          <table className="mt-3 w-full text-[15px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-ink-3">
                <th className="py-1.5 font-semibold">Source</th>
                <th className="py-1.5 text-right font-semibold">Visits</th>
                <th className="py-1.5 text-right font-semibold">Apply clicks</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-t border-line">
                  <td className="py-2 pr-3">{r.label}</td>
                  <td className="py-2 text-right tabular-nums">
                    {n(r.views)} <span className="text-ink-3">({r.pct}%)</span>
                  </td>
                  <td className="py-2 text-right tabular-nums">{n(r.clicks)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-3 text-sm text-ink-3">Nothing to show yet.</p>
        )}
        {earlierClicks > 0 && (
          <p className="mt-3 text-xs text-ink-3">
            {n(earlierClicks)} earlier apply {earlierClicks === 1 ? "click came" : "clicks came"} in before I started tracking sources, so {earlierClicks === 1 ? "it isn't" : "they aren't"} in this table.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-lg font-bold tracking-tight">What your package included</h2>
        <ul className="mt-3 space-y-2.5">
          {channels.map(([k, v]) => (
            <li key={k} className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
              <span className="font-semibold">{k}</span>
              <span className="text-ink-2 sm:text-right">{v}</span>
            </li>
          ))}
        </ul>
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
