import { notFound } from "next/navigation";
import { getCompany } from "@/lib/data";
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
  const state = await getUserState();
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

      <dl className="mt-4 grid grid-cols-3 gap-3">
        {[
          ["Open sales jobs", jobs.length],
          ["Added last 7 days", added7],
          ["Added last 30 days", added30],
        ].map(([l, v]) => (
          <div key={l as string} className="rounded-xl border border-line bg-surface p-4">
            <dt className="text-xs uppercase tracking-wide text-ink-3">{l}</dt>
            <dd className="mt-1 text-2xl font-bold">{v}</dd>
          </div>
        ))}
      </dl>

      <h2 className="mb-3 mt-8 text-lg font-bold tracking-tight">Current openings</h2>
      <JobGrid jobs={jobs} ctx={{ savedJobIds: state.savedJobIds, back }} empty={`${company.name} has no open sales roles right now. Watch them to hear when that changes.`} />
    </>
  );
}
