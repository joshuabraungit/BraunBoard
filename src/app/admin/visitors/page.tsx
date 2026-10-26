import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin";

export interface Traffic {
  today_visitors: number;
  today_views: number;
  week_visitors: number;
  week_views: number;
  month_visitors: number;
  month_views: number;
  daily: { d: string; visitors: number; views: number }[];
  sources: { label: string; n: number }[];
  pages: { label: string; n: number }[];
  landing: { label: string; n: number }[];
  countries: { label: string; n: number }[];
  devices: { label: string; n: number }[];
}

const COUNTRY: Record<string, string> = { US: "United States", CA: "Canada", GB: "United Kingdom", IN: "India", AU: "Australia", DE: "Germany", IE: "Ireland", NL: "Netherlands", FR: "France", "?": "Unknown" };
const PERIODS = [7, 30, 90];

function Stat({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-xs uppercase tracking-wide text-ink-3">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">{value.toLocaleString()}</p>
      <p className="mt-0.5 text-xs text-ink-3">{sub}</p>
    </div>
  );
}

function List({ title, rows, note, total, format = (s: string) => s }: { title: string; rows: { label: string; n: number }[]; note?: string; total: number; format?: (s: string) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-xs uppercase tracking-wide text-ink-3">{title}</p>
      {rows.length ? (
        <ul className="mt-3 space-y-2">
          {rows.map((r) => (
            <li key={r.label} className="grid grid-cols-[minmax(0,10rem)_1fr_4.5rem] items-center gap-3 text-sm">
              <span className="truncate font-medium" title={r.label}>{format(r.label)}</span>
              <span className="h-2 rounded-full bg-line">
                <span className="block h-2 rounded-full bg-accent" style={{ width: `${(r.n / max) * 100}%` }} />
              </span>
              <span className="text-right tabular-nums">
                {r.n.toLocaleString()} <span className="text-xs text-ink-3">{total ? `${Math.round((r.n / total) * 100)}%` : ""}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-ink-3">No visits yet.</p>
      )}
      {note && <p className="mt-3 text-xs text-ink-3">{note}</p>}
    </div>
  );
}

/** One bar per day. Hover a bar to see the numbers. */
function Daily({ rows }: { rows: Traffic["daily"] }) {
  const max = Math.max(1, ...rows.map((r) => r.visitors));
  const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-xs uppercase tracking-wide text-ink-3">Visitors per day</p>
        <p className="text-xs text-ink-3">Peak {max.toLocaleString()}</p>
      </div>
      <div className="mt-4 flex h-40 items-end gap-[2px]">
        {rows.map((r) => (
          <div key={r.d} className="group relative flex h-full flex-1 items-end" title={`${fmt(r.d)}: ${r.visitors} visitors, ${r.views} page views`}>
            <div className="w-full rounded-t-sm bg-accent group-hover:opacity-80" style={{ height: `${Math.max(r.visitors ? 2 : 0, (r.visitors / max) * 100)}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-ink-3">
        <span>{rows[0] && fmt(rows[0].d)}</span>
        <span>{rows.at(-1) && fmt(rows.at(-1)!.d)}</span>
      </div>
    </div>
  );
}

export default async function VisitorsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requireAdmin();
  const { days: raw } = await searchParams;
  const days = PERIODS.includes(Number(raw)) ? Number(raw) : 30;
  const { data, error } = await adminClient().rpc("admin_traffic", { days });
  if (error || !data) return <p className="text-red">Couldn&apos;t load visitors: {error?.message}</p>;
  const t = data as Traffic;
  const visits = t.month_visitors;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Visitors</h1>
        <div className="flex gap-1 text-sm">
          {PERIODS.map((p) => (
            <Link key={p} href={`/admin/visitors?days=${p}`} className={`rounded-md px-2.5 py-1 ${p === days ? "bg-ink font-semibold text-white" : "text-ink-2 hover:bg-surface"}`}>
              {p} days
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Today" value={t.today_visitors} sub={`${t.today_views.toLocaleString()} page views`} />
        <Stat label="Last 7 days" value={t.week_visitors} sub={`${t.week_views.toLocaleString()} page views`} />
        <Stat label={`Last ${days} days`} value={t.month_visitors} sub={`${t.month_views.toLocaleString()} page views`} />
        <Stat label="Pages per visit" value={visits ? Math.round((t.month_views / visits) * 10) / 10 : 0} sub={`Average, last ${days} days`} />
      </div>

      <div className="mt-3">
        <Daily rows={t.daily} />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <List title="Where they came from" rows={t.sources} total={visits} note="Judged by the site that sent them, or the tag on the link. Direct means they typed it in, used a bookmark, or the app they came from didn't say (LinkedIn's phone app often doesn't)." />
        <List title="First page they landed on" rows={t.landing} total={visits} />
        <List title="Most viewed pages" rows={t.pages} total={t.month_views} note="Every page view, including people clicking around." />
        <div className="grid gap-3">
          <List title="Country" rows={t.countries} total={visits} format={(c) => COUNTRY[c] ?? c} />
          <List title="Device" rows={t.devices} total={visits} />
        </div>
      </div>

      <p className="mt-6 text-xs text-ink-3">
        Counted by Braun Board itself, with no cookies. A visitor is one browser on one day, so someone who comes back on three days counts three times in the weekly
        number. Bots, search engine crawlers and your admin pages aren&apos;t counted. Counting started October 26, 2026. Vercel&apos;s own Analytics tab will show similar,
        not identical, numbers.
      </p>
    </>
  );
}
