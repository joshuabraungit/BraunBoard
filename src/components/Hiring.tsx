import Link from "next/link";
import type { CompanyListItem, CompanyStats, HiringTrend } from "@/lib/data";
import { CompanyLogo } from "./CompanyLogo";

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

/** One plain sentence about how a company is hiring. */
export function hiringSentence(s: CompanyStats): string {
  const roles = (n: number) => `${n} sales role${n === 1 ? "" : "s"}`;
  if (s.trend === "ramping")
    return `Posted ${roles(s.new_30d)} in the last 30 days${s.new_prev_30d ? `, up from ${s.new_prev_30d} the month before` : ""}.`;
  if (s.trend === "pulling_back")
    return s.open_roles_30d_ago != null && s.open_roles < s.open_roles_30d_ago
      ? `Down to ${roles(s.open_roles)} open from ${s.open_roles_30d_ago} a month ago.`
      : `Closed ${roles(s.closed_30d)} in the last 30 days and posted ${s.new_30d}.`;
  return s.new_30d ? `Posted ${roles(s.new_30d)} in the last 30 days.` : "No new sales roles posted in the last 30 days.";
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
