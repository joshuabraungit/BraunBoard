// The numbers block of a sponsor's results page, shared by /results/<token> and the sample on /employers.
import type { SourceRow } from "@/lib/sponsor-results";

const n = (x: number) => x.toLocaleString("en-US");

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">{label}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-3">{sub}</p>}
    </div>
  );
}

export function ResultsStats({ views, clicks }: { views: number; clicks: number }) {
  return (
    <section className="grid grid-cols-2 gap-3">
      <Stat label="Job page views" value={n(views)} sub="People who opened your job" />
      <Stat label="Apply clicks" value={n(clicks)} sub="Went on to your application" />
    </section>
  );
}

export function SourcesTable({ rows, showClicks = true }: { rows: SourceRow[]; showClicks?: boolean }) {
  if (!rows.length) return <p className="mt-3 text-sm text-ink-3">Nothing to show yet.</p>;
  return (
    <table className="mt-3 w-full text-[15px]">
      <thead>
        <tr className="text-left text-xs uppercase tracking-wide text-ink-3">
          <th className="py-1.5 font-semibold">Source</th>
          <th className="py-1.5 text-right font-semibold">Visits</th>
          {showClicks && <th className="py-1.5 text-right font-semibold">Apply clicks</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className="border-t border-line">
            <td className="py-2 pr-3">{r.label}</td>
            <td className="py-2 text-right tabular-nums">
              {n(r.views)} <span className="text-ink-3">({r.pct}%)</span>
            </td>
            {showClicks && <td className="py-2 text-right tabular-nums">{n(r.clicks)}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * The run's life meter: the same video-game health bar the job cards use, one bar for every three days
 * of the run, draining as it goes. Green, then yellow in the last week, red in the last few days.
 */
export function RunMeter({ day, total, left, over }: { day: number; total: number; left: number; over: boolean }) {
  const bars = 10;
  const full = over ? 0 : Math.max(1, Math.ceil((left / total) * bars));
  const tone = over || left <= 3 ? "bg-[#d1503f]" : left <= 7 ? "bg-[#d9a23a]" : "bg-[#4cae73]";
  const label = over ? "All done" : left === 0 ? "Last day" : `${left} ${left === 1 ? "day" : "days"} left`;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1" role="img" aria-label={`Day ${day} of ${total}. ${label}.`}>
      <span className="inline-flex items-center gap-[3px]" aria-hidden>
        {Array.from({ length: bars }, (_, i) => (
          <span key={i} className={`h-3.5 w-[9px] rounded-[2px] ${i < full ? tone : "bg-line-strong"}`} />
        ))}
      </span>
      <span className="text-sm font-semibold text-ink-2" aria-hidden>
        {over ? `Ran all ${total} days` : `Day ${day} of ${total} · ${label}`}
      </span>
    </div>
  );
}
