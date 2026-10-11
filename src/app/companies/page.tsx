import Link from "next/link";
import { listCompanies } from "@/lib/data";
import { getUserState } from "@/lib/session";
import { CompanyLogo } from "@/components/CompanyLogo";
import { WatchCompanyButton } from "@/components/Actions";

export const dynamic = "force-dynamic";

export default async function Companies() {
  const [companies, state] = await Promise.all([listCompanies(), getUserState()]);
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Companies</h1>
      <p className="mb-6 mt-1 text-sm text-ink-2">Companies with open sales roles, most new openings this week first.</p>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {companies.map((c) => (
          <li key={c.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
            <CompanyLogo name={c.name} logoUrl={c.logo_url} domain={c.domain} size={36} />
            <Link href={`/company/${c.slug}`} className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{c.name}</span>
              <span className="text-xs text-ink-3">
                {c.open_jobs} open sales job{c.open_jobs === 1 ? "" : "s"}
                {c.added_7d > 0 && <span className="text-fresh"> · {c.added_7d} new this week</span>}
              </span>
            </Link>
            <WatchCompanyButton companyId={c.id} on={state.watchedCompanyIds.has(c.id)} back="/companies" className="whitespace-nowrap text-xs text-ink-2 hover:text-ink aria-pressed:font-semibold aria-pressed:text-fresh" />
          </li>
        ))}
      </ul>
    </>
  );
}
