import Link from "next/link";
import { byHiringFastest, listCompanies, listJobs } from "@/lib/data";
import { HiringRow } from "@/components/Hiring";
import { PicksSignup } from "@/components/PicksSignup";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { JobGrid, Section } from "@/components/JobCard";
import { getActiveWatch, getUserState } from "@/lib/session";
import { rankForWatch } from "@/lib/matching";
import { marketsFor, visitorMarket } from "@/lib/market";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ picks?: string }> }) {
  const { picks } = await searchParams;
  // Sections follow the visitor's country: UK visitors see UK jobs, North America sees US + Canada.
  const market = await visitorMarket();
  const markets = marketsFor(market);
  const uk = market === "UK";
  // High OTE: $250K+ in USD terms, which is £200K+ for UK jobs.
  const highOteMin = 250_000;
  const [newToday, highOte, remoteEnt, state, watch, companies] = await Promise.all([
    listJobs({ postedWithinDays: 1, markets }, 6),
    listJobs({ minOte: highOteMin, postedWithinDays: 90, markets }, 6),
    listJobs({ role: "Account Executive", segment: "Enterprise", remote: "Remote", postedWithinDays: 90, markets }, 6),
    getUserState(),
    getActiveWatch(),
    listCompanies(),
  ]);
  const rampingUp = companies.filter((c) => c.trend === "ramping").sort(byHiringFastest).slice(0, 6);
  const ctx = { savedJobIds: state.savedJobIds, back: "/" };
  const forYou = watch
    ? rankForWatch(await listJobs({ markets: watch.prefs.countries ?? ["US"] }, 1000, { withDescription: true }), watch.prefs, state.hiddenJobIds)
    : null;

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
      {rampingUp.length > 0 && (
        <Section title="Hiring fastest" href="/companies">
          <p className="-mt-1 mb-3 text-sm text-ink-2">Companies posting the most new sales roles in the last 30 days.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rampingUp.map((c) => (
              <HiringRow key={c.id} c={c} />
            ))}
          </div>
        </Section>
      )}
      <div className="mt-10">
        <PicksSignup back="/" source="home" status={picks} compact />
      </div>
      <Section title={uk ? "High OTE · £200K+" : "High OTE · $250K+"} href={`/jobs?minOte=250000&country=${market}`}>
        <JobGrid jobs={highOte} ctx={ctx} />
      </Section>
      <Section title="Remote Enterprise AE" href={`/jobs?role=Account+Executive&segment=Enterprise&remote=Remote&country=${market}`}>
        <JobGrid jobs={remoteEnt} ctx={ctx} />
      </Section>
    </>
  );
}
