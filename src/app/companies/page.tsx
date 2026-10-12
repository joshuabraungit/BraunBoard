import Link from "next/link";
import { byHiringFastest, byMostOpen, byPullingBack, listCompanies } from "@/lib/data";
import { getUserState } from "@/lib/session";
import { CompanyLogo } from "@/components/CompanyLogo";
import { WatchCompanyButton } from "@/components/Actions";
import { TrendBadge } from "@/components/Hiring";

export const dynamic = "force-dynamic";

const SORTS = {
  fastest: { label: "Hiring fastest", sort: byHiringFastest, blurb: "Companies posting the most new sales roles over the last 30 days." },
  open: { label: "Most open roles", sort: byMostOpen, blurb: "Companies with the most open sales roles right now." },
  pulling: { label: "Pulling back", sort: byPullingBack, blurb: "Companies closing more sales roles than they're opening." },
} as const;
type SortKey = keyof typeof SORTS;

export default async function Companies({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  const { sort } = await searchParams;
  const key: SortKey = sort && sort in SORTS ? (sort as SortKey) : "fastest";
  const [all, state] = await Promise.all([listCompanies(), getUserState()]);
  const companies = [...all].sort(SORTS[key].sort);
  const counts = { ramping: all.filter((c) => c.trend === "ramping").length, pulling: all.filter((c) => c.trend === "pulling_back").length };

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Companies</h1>
      <p className="mt-1 text-sm text-ink-2">
        {all.length} companies hiring sellers. {counts.ramping} ramping up, {counts.pulling} pulling back.
      </p>

      <nav className="mb-4 mt-5 flex flex-wrap gap-2" aria-label="Sort companies">
        {(Object.keys(SORTS) as SortKey[]).map((k) => (
          <Link
            key={k}
            href={k === "fastest" ? "/companies" : `/companies?sort=${k}`}
            aria-current={k === key ? "page" : undefined}
            className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-ink-2 hover:text-ink aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-white"
          >
            {SORTS[k].label}
          </Link>
        ))}
      </nav>
      <p className="mb-4 text-sm text-ink-3">{SORTS[key].blurb}</p>

      {key === "pulling" && counts.pulling === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-ink-3">
          Nobody is clearly pulling back yet. We started tracking openings and closings on October 11, so this fills in over the next few weeks.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((c) => (
            <li key={c.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
              <CompanyLogo name={c.name} logoUrl={c.logo_url} domain={c.domain} size={36} />
              <Link href={`/company/${c.slug}`} className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate font-semibold">{c.name}</span>
                  {c.trend !== "steady" && <TrendBadge trend={c.trend} />}
                </span>
                <span className="text-xs text-ink-3">
                  {c.open_roles} open · {c.new_30d} new in 30 days
                  {c.closed_30d > 0 && ` · ${c.closed_30d} closed`}
                </span>
              </Link>
              <WatchCompanyButton companyId={c.id} on={state.watchedCompanyIds.has(c.id)} back="/companies" className="whitespace-nowrap text-xs text-ink-2 hover:text-ink aria-pressed:font-semibold aria-pressed:text-fresh" />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
