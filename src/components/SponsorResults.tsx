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

export function ResultsStats({ views, clicks, rate }: { views: number; clicks: number; rate: string | null }) {
  return (
    <section className="grid gap-3 sm:grid-cols-3">
      <Stat label="Job page views" value={n(views)} />
      <Stat label="Apply clicks" value={n(clicks)} sub="Clicks through to your application" />
      <Stat label="Apply rate" value={rate ?? "–"} sub="Apply clicks per view" />
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
