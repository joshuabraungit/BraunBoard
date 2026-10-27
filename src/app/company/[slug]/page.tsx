import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getCompany, getCompanyStats } from "@/lib/data";
import { TrendBadge, hiringSentence } from "@/components/Hiring";
import { CompanyLogo } from "@/components/CompanyLogo";
import { JobGrid } from "@/components/JobCard";
import { WatchCompanyButton } from "@/components/Actions";
import { getUserState } from "@/lib/session";
import { isSizeBucket, SIZE_LABELS } from "@/lib/ingest/size";

export const dynamic = "force-dynamic";

const loadCompany = cache(getCompany);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadCompany(slug);
  if (!data) return { title: "Company not found · Braun Board" };
  return {
    title: `${data.company.name} sales jobs · Braun Board`,
    description: `Open sales jobs at ${data.company.name}, with the pay they publish and what each posting leaves out.`,
    alternates: { canonical: `/company/${data.company.slug}` },
    openGraph: {
      type: "website",
      siteName: "Braun Board",
      url: `/company/${data.company.slug}`,
      images: ["/opengraph-image"],
      title: `${data.company.name} sales jobs`,
      description: `${data.jobs.length} open sales ${data.jobs.length === 1 ? "job" : "jobs"} at ${data.company.name}, with the pay they publish and what each posting leaves out.`,
    },
  };
}

export default async function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await loadCompany(slug);
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
          <p className="text-sm text-ink-2">
            {company.website_url && (
              <a href={company.website_url} target="_blank" rel="noopener" className="hover:underline">
                {company.domain}
              </a>
            )}
            {isSizeBucket(company.size_bucket) && (
              <>
                {company.website_url && " · "}
                <span title={company.size_quote ? `From their posting: "${company.size_quote}"` : company.size_source === "estimate" ? "Our best estimate. Not from the company." : undefined}>
                  {SIZE_LABELS[company.size_bucket].label}, {SIZE_LABELS[company.size_bucket].range}
                  {company.size_source === "estimate" ? " (our estimate)" : ""}
                </span>
              </>
            )}
          </p>
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
