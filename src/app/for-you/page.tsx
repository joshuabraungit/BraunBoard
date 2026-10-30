import type { Metadata } from "next";
import Link from "next/link";
import { listJobs } from "@/lib/data";
import { getActiveWatch, getUserState, listWatches } from "@/lib/session";
import { rankForWatch } from "@/lib/matching";
import { JobGrid } from "@/components/JobCard";
import { OnboardingForm } from "./OnboardingForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { alternates: { canonical: "/for-you" } };

export default async function ForYou({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const watch = await getActiveWatch(sp.watch);

  if (!watch || sp.edit !== undefined) {
    return (
      <div className="py-4">
        <h1 className="mx-auto mb-8 max-w-2xl text-3xl font-bold tracking-tight">What sales job would you actually take?</h1>
        <OnboardingForm initial={watch?.answers} />
      </div>
    );
  }

  const [state, jobs, watches] = await Promise.all([getUserState(), listJobs({ markets: watch.prefs.countries ?? ["US"] }, 1000, { withDescription: true }), listWatches()]);
  const ranked = rankForWatch(jobs, watch.prefs, state.hiddenJobIds);

  return (
    <>
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
            <span className="font-semibold">Want an email when a new one shows up?</span> Sign in and we&apos;ll save this as your watch.
          </p>
          <Link href="/login?next=/for-you" className="rounded-lg bg-ink px-3.5 py-2 text-sm font-semibold text-white">
            Get alerts →
          </Link>
        </div>
      )}

      <JobGrid
        jobs={ranked.jobs}
        ctx={{ savedJobIds: state.savedJobIds, matches: ranked.matches, back: "/for-you", allowHide: state.signedIn }}
        empty="Nothing matches yet. That's the point: we'll tell you when it shows up. Loosen a preference if you want to browse in the meantime."
      />
    </>
  );
}
