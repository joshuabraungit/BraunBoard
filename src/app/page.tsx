import Link from "next/link";
import { listJobs } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { JobGrid, Section } from "@/components/JobCard";
import { getActiveWatch, getUserState } from "@/lib/session";
import { rankForWatch } from "@/lib/matching";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [newToday, highOte, remoteEnt, state, watch] = await Promise.all([
    listJobs({ postedWithinDays: 1 }, 6),
    listJobs({ minOte: 250_000 }, 6),
    listJobs({ role: "Account Executive", segment: "Enterprise", remote: "Remote" }, 6),
    getUserState(),
    getActiveWatch(),
  ]);
  const ctx = { savedJobIds: state.savedJobIds, back: "/" };
  const forYou = watch ? rankForWatch(await listJobs({}, 1000, { withDescription: true }), watch.prefs, state.hiddenJobIds) : null;

  return (
    <>
      {!isSupabaseConfigured() && (
        <p className="mb-6 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink-2">
          Showing sample jobs from made-up companies. Add Supabase keys to <code>.env.local</code> and run the ingester for real inventory.
        </p>
      )}

      {forYou ? (
        <Section title={`For You · ${watch!.name}`} href="/for-you">
          <JobGrid jobs={forYou.jobs.slice(0, 3)} ctx={{ ...ctx, matches: forYou.matches }} empty="No matches yet. We'll tell you when one shows up." />
        </Section>
      ) : (
      <div className="mb-10 rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <h1 className="max-w-xl text-2xl font-bold tracking-tight sm:text-3xl">
          Tell us the sales job you would take. We will tell you when it shows up.
        </h1>
        <p className="mt-2 text-ink-2">Fresh B2B sales jobs pulled straight from employer career pages, with the stuff sellers actually care about up front.</p>
        <Link href="/for-you" className="mt-5 inline-block rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90">
          Set up my watch →
        </Link>
      </div>
      )}

      <Section title="New Today" href="/new">
        <JobGrid jobs={newToday} ctx={ctx} empty="No new sales jobs in the last 24 hours yet." />
      </Section>
      <Section title="High OTE · $250K+" href="/jobs?minOte=250000">
        <JobGrid jobs={highOte} ctx={ctx} />
      </Section>
      <Section title="Remote Enterprise AE" href="/jobs?role=Account+Executive&segment=Enterprise&remote=Remote">
        <JobGrid jobs={remoteEnt} ctx={ctx} />
      </Section>
    </>
  );
}
