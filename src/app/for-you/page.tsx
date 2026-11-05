import { LightsKey } from "@/components/BraunRead";
import type { Metadata } from "next";
import { JOB_TABS, PageTabs } from "@/components/PageTabs";
import Link from "next/link";
import { listJobsForWatch } from "@/lib/data";
import { getActiveWatch, getUserState, listWatches } from "@/lib/session";
import { rankForWatch } from "@/lib/matching";
import { JobGrid } from "@/components/JobCard";
import { OnboardingForm } from "./OnboardingForm";
import { INDUSTRIES, isIndustry } from "@/lib/industries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { alternates: { canonical: "/for-you" } };

// Every match on one page was ~2.5MB for a typical watch. Best matches first, a batch at a time.
const BATCH = 30;

export default async function ForYou({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const watch = await getActiveWatch(sp.watch);

  if (!watch || sp.edit !== undefined) {
    return (
      <div className="py-4">
        <PageTabs tabs={JOB_TABS} active="/for-you" />
        <h1 className="mx-auto mb-8 max-w-2xl text-3xl font-bold tracking-tight">What sales job would you actually take?</h1>
        <OnboardingForm initial={watch?.answers} signedIn={(await getUserState()).signedIn} />
      </div>
    );
  }

  const [state, jobs, watches] = await Promise.all([getUserState(), listJobsForWatch(watch.prefs.countries ?? ["US"], watch.prefs.keywords), listWatches()]);
  // Their industries, if the watch has any. "?industries=any" shows every industry for a look,
  // without changing the watch (alerts still stick to their industries).
  const picked = (watch.prefs.industries ?? []).filter(isIndustry);
  const anyIndustry = picked.length > 0 && sp.industries === "any";
  const prefs = anyIndustry ? { ...watch.prefs, industries: [] } : watch.prefs;
  const ranked = rankForWatch(jobs, prefs, state.hiddenJobIds);
  // Few or no matches with an industry filter on: how many there'd be in any industry.
  const THIN = 5;
  const filtered = picked.length > 0 && !anyIndustry;
  const wide = filtered && ranked.jobs.length < THIN ? rankForWatch(jobs, { ...watch.prefs, industries: [] }, state.hiddenJobIds).jobs.length : 0;
  const industryNames = picked.map((k) => INDUSTRIES[k].label).join(" or ");
  const base = { ...(sp.watch ? { watch: sp.watch } : {}) };
  const anyHref = `/for-you?${new URLSearchParams({ ...base, industries: "any" })}`;
  const backHref = `/for-you?${new URLSearchParams(base)}`;
  const editHref = `/for-you?edit${watch.id ? `&watch=${watch.id}` : ""}`;
  const shown = Math.min(ranked.jobs.length, Math.max(BATCH, Math.floor(Number(sp.show)) || BATCH));
  const moreHref = `/for-you?${new URLSearchParams({ ...base, ...(anyIndustry ? { industries: "any" } : {}), show: String(shown + BATCH) })}`;
  const emptyText = filtered
    ? `Nothing in ${industryNames} matches yet. ${state.signedIn ? "I'll email you when one shows up." : "When one shows up, it lands here."}`
    : "Nothing matches yet. That's the point: I'll tell you when it shows up. Loosen a preference if you want to browse in the meantime.";

  return (
    <>
      <PageTabs tabs={JOB_TABS} active="/for-you" />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-ink-3">For You</p>
          <h1 className="text-2xl font-bold tracking-tight">{watch.name}</h1>
          <p className="mt-1 text-sm text-ink-2">
            {ranked.jobs.length} matching job{ranked.jobs.length === 1 ? "" : "s"}
            {ranked.blocked > 0 && ` · ${ranked.blocked} hidden by your dealbreakers`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          {watches.length > 1 &&
            watches.map((w) => (
              <Link key={w.id} href={`/for-you?watch=${w.id}`} className={`rounded-full border px-3 py-1.5 ${w.id === watch.id ? "border-ink bg-ink text-white" : "border-line-strong bg-surface"}`}>
                {w.name}
              </Link>
            ))}
          <Link href={`/for-you?edit${watch.id ? `&watch=${watch.id}` : ""}`} className="rounded-full border border-line-strong bg-surface px-3 py-1.5">
            Upload résumé
          </Link>
          <Link href={`/for-you?edit${watch.id ? `&watch=${watch.id}` : ""}`} className="rounded-full border border-line-strong bg-surface px-3 py-1.5">
            Edit preferences
          </Link>
        </div>
      </div>

      {!watch.prefs.experience?.length && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3">
          <p className="text-sm">
            <span className="font-semibold">New:</span> upload your résumé and jobs selling to buyers you already know will rank higher.
          </p>
          <Link href={`/for-you?edit${watch.id ? `&watch=${watch.id}` : ""}`} className="rounded-lg bg-ink px-3.5 py-2 text-sm font-semibold text-white">
            Upload résumé →
          </Link>
        </div>
      )}

      {!state.signedIn && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3">
          <p className="text-sm">
            <span className="font-semibold">Want an email when a new one shows up?</span> Sign in and I&apos;ll save this as your watch.
          </p>
          <Link href="/login?next=/for-you" className="rounded-lg bg-ink px-3.5 py-2 text-sm font-semibold text-white">
            Get alerts →
          </Link>
        </div>
      )}

      {anyIndustry && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3">
          <p className="text-sm">
            <span className="font-semibold">Showing every industry.</span> Your watch still sticks to {industryNames}.
          </p>
          <Link href={backHref} className="rounded-lg border border-line-strong bg-bg px-3.5 py-2 text-sm font-semibold">
            Back to {industryNames}
          </Link>
        </div>
      )}

      {filtered && ranked.jobs.length > 0 && ranked.jobs.length < THIN && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3">
          <p className="text-sm">
            <span className="font-semibold">
              Only {ranked.jobs.length} so far in {industryNames}.
            </span>{" "}
            Add another industry to see more.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href={editHref} className="rounded-lg border border-line-strong bg-bg px-3.5 py-2 text-sm font-semibold">
              Add an industry
            </Link>
            {wide > ranked.jobs.length && (
              <Link href={anyHref} className="rounded-lg bg-ink px-3.5 py-2 text-sm font-semibold text-white">
                See any industry ({wide})
              </Link>
            )}
          </div>
        </div>
      )}

      {filtered && ranked.jobs.length === 0 && wide > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3">
          <p className="text-sm">
            <span className="font-semibold">Want to look around in the meantime?</span> {wide} sales job{wide === 1 ? "" : "s"} fit everything else you picked.
          </p>
          <Link href={anyHref} className="rounded-lg bg-ink px-3.5 py-2 text-sm font-semibold text-white">
            See any industry →
          </Link>
        </div>
      )}

      <LightsKey className="mb-3" />
      <JobGrid
        jobs={ranked.jobs.slice(0, shown)}
        ctx={{ savedJobIds: state.savedJobIds, matches: ranked.matches, back: "/for-you", allowHide: state.signedIn }}
        empty={emptyText}
      />
      {ranked.jobs.length > shown && (
        <div className="mt-8 text-center">
          <Link
            href={moreHref}
            scroll={false}
            className="inline-flex min-h-11 items-center rounded-lg border border-line-strong bg-surface px-5 text-sm font-semibold hover:border-ink"
          >
            Show more matches ({ranked.jobs.length - shown} left)
          </Link>
        </div>
      )}
    </>
  );
}
