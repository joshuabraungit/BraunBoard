import Link from "next/link";
import type { CompanyListItem, HiringTrend } from "@/lib/data";
import { CompanyLogo } from "./CompanyLogo";
export { hiringSentence } from "@/lib/hiring-text";

const TREND: Record<HiringTrend, { label: string; cls: string; icon: string }> = {
  ramping: { label: "Ramping up", cls: "bg-accent-soft text-accent", icon: "↗" },
  steady: { label: "Steady", cls: "bg-bg text-ink-2 ring-1 ring-line", icon: "→" },
  pulling_back: { label: "Pulling back", cls: "bg-red-soft text-red", icon: "↘" },
};

export function TrendBadge({ trend }: { trend: HiringTrend }) {
  const t = TREND[trend];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${t.cls}`}>
      <span aria-hidden>{t.icon}</span>
      {t.label}
    </span>
  );
}

export function HiringRow({ c }: { c: CompanyListItem }) {
  return (
    <Link href={`/company/${c.slug}`} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3 transition hover:border-line-strong">
      <CompanyLogo name={c.name} logoUrl={c.logo_url} domain={c.domain} size={36} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-semibold">{c.name}</span>
          <TrendBadge trend={c.trend} />
        </span>
        <span className="mt-0.5 block text-xs text-ink-3">
          {c.open_roles} open · {c.new_30d} new in 30 days
        </span>
      </span>
    </Link>
  );
}
