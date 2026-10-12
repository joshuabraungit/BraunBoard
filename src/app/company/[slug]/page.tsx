import { notFound } from "next/navigation";
import { getCompany, getCompanyStats } from "@/lib/data";
import { TrendBadge, hiringSentence } from "@/components/Hiring";
import { CompanyLogo } from "@/components/CompanyLogo";
import { JobGrid } from "@/components/JobCard";
import { WatchCompanyButton } from "@/components/Actions";
import { getUserState } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getCompany(slug);
  if (!data) notFound();
  const { company, jobs, added7, added30 } = data;
  const [state, stats] = await Promise.all([getUserState(), getCompanyStats(company.id)]);
  const back = `/company/${company.slug}`;

  return (
    <>
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-5">
        <CompanyLogo name={company.name} logoUrl={company.logo_url} domain={company.domain} size={56} />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{company.name}</h1>
          {company.website_url && (
            <a href={company.website_url} target="_blank" rel="noopener" className="text-sm text-ink-2 hover:underline">
              {company.domain}
            </a>
          )}
        </div>
        <WatchCompanyButton companyId={company.id} on={state.watchedCompanyIds.has(company.id)} back={back} className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white aria-pressed:bg-surface aria-pressed:text-fresh aria-pressed:ring-1 aria-pressed:ring-fresh" />
      </div>

      {stats && (
        <section className="mt-4 rounded-2xl border border-line bg-surface p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink-2">Hiring velocity</h2>
            <TrendBadge trend={stats.trend} />
          </div>
          <p className="mt-1 text-sm text-ink-2">{hiringSentence(stats)}</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                ["Open sales roles", stats.open_roles],
                ["New last 30 days", stats.new_30d],
                ["Closed last 30 days", stats.closed_30d],
                ["Typical role open", stats.median_days_open != null ? `${stats.median_days_open} days` : "n/a"],
              ] as const
            ).map(([l, v]) => (
              <div key={l} className="rounded-xl bg-bg p-3">
                <dt className="text-xs uppercase tracking-wide text-ink-3">{l}</dt>
                <dd className="mt-1 text-xl font-bold">{v}</dd>
              </div>
            ))}
          </dl>
          {stats.open_roles >= 25 && (
            <p className="mt-3 text-sm text-ink-2">
              Lots of open sales roles can mean real growth or a revolving door. Ask how many reps they hired last year and how many are still there.
            </p>
          )}
        </section>
      )}
      {!stats && (
        <p className="mt-4 text-sm text-ink-3">
          {jobs.length} open sales job{jobs.length === 1 ? "" : "s"} · {added7} added this week · {added30} in the last 30 days
        </p>
      )}

      <h2 className="mb-3 mt-8 text-lg font-bold tracking-tight">Current openings</h2>
      <JobGrid jobs={jobs} ctx={{ savedJobIds: state.savedJobIds, back }} empty={`${company.name} has no open sales roles right now. Watch them to hear when that changes.`} />
    </>
  );
}
