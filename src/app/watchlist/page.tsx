import Link from "next/link";
import { getJobsByIds, listCompanies } from "@/lib/data";
import { getUser, getUserState, listWatches } from "@/lib/session";
import { deleteWatch, renameWatch } from "@/app/actions";
import { CompanyLogo } from "@/components/CompanyLogo";
import { JobGrid } from "@/components/JobCard";
import { WatchCompanyButton } from "@/components/Actions";

export const dynamic = "force-dynamic";

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-ink-3">{children}</p>;
}

export default async function Watchlist({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await getUser();
  if (!user) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <h1 className="text-2xl font-bold tracking-tight">Watchlist</h1>
        <p className="mt-2 text-ink-2">Your saved searches, watched companies and saved jobs live here.</p>
        <Link href="/login?next=/watchlist" className="mt-6 inline-block rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white">Sign in →</Link>
      </div>
    );
  }

  const [watches, state, companies] = await Promise.all([listWatches(), getUserState(), listCompanies()]);
  const saved = await getJobsByIds([...state.savedJobIds]);
  const watchedCompanies = companies.filter((c) => state.watchedCompanyIds.has(c.id));

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Watchlist</h1>
      {sp.created && <p className="mt-3 rounded-md bg-accent-soft px-3 py-2 text-sm text-accent">Search saved. You&apos;ll get alerts when new jobs match.</p>}

      <h2 className="mb-3 mt-8 text-lg font-bold">Searches</h2>
      {watches.length ? (
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
          {watches.map((w) => (
            <li key={w.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <form action={renameWatch} className="flex min-w-0 flex-1 items-center gap-2">
                <input type="hidden" name="id" value={w.id} />
                <input name="name" defaultValue={w.name} aria-label="Watch name" className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 py-1 font-semibold hover:border-line focus:border-line-strong" />
                <button className="text-xs text-ink-3 hover:text-ink">Rename</button>
              </form>
              {w.is_primary && <span className="rounded bg-bg px-1.5 py-0.5 text-xs text-ink-2 ring-1 ring-line">Primary</span>}
              <span className="text-xs text-ink-3">Alerts: {w.alert_frequency === "instant" ? "Instant" : w.alert_frequency === "daily" ? "Daily digest" : "Off"}</span>
              <Link href={`/for-you?watch=${w.id}`} className="text-sm font-semibold hover:underline">Matches →</Link>
              <form action={deleteWatch}>
                <input type="hidden" name="id" value={w.id} />
                <button className="text-xs text-ink-3 hover:text-fresh">Delete</button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>
          No watches yet. <Link href="/for-you" className="underline">Tell me the job you&apos;d take</Link> or hit &ldquo;Watch this search&rdquo; on All Jobs.
        </Empty>
      )}

      <h2 className="mb-3 mt-10 text-lg font-bold">Companies</h2>
      {watchedCompanies.length ? (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {watchedCompanies.map((c) => (
            <li key={c.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
              <CompanyLogo name={c.name} logoUrl={c.logo_url} domain={c.domain} size={32} />
              <Link href={`/company/${c.slug}`} className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{c.name}</span>
                <span className="text-xs text-ink-3">{c.open_roles} open · {c.new_7d} new this week</span>
              </Link>
              <WatchCompanyButton companyId={c.id} on back="/watchlist" className="text-xs text-ink-3 hover:text-ink" />
            </li>
          ))}
        </ul>
      ) : (
        <Empty>
          Watch a company and we&apos;ll email you when it posts a new sales role. <Link href="/products" className="underline">Browse companies by product</Link>
        </Empty>
      )}

      <h2 className="mb-3 mt-10 text-lg font-bold">Saved jobs</h2>
      <JobGrid jobs={saved} ctx={{ savedJobIds: state.savedJobIds, back: "/watchlist" }} empty="Hit ♡ Save on any job to keep it here." />
    </>
  );
}
