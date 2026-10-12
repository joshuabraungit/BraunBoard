import { k, type Dist, type SalaryStats } from "@/lib/salaries";

/** Big number with its middle-50% range under it. */
export function Stat({ label, d, note }: { label: string; d: Dist | null; note?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <dt className="text-xs uppercase tracking-wide text-ink-3">{label}</dt>
      {d ? (
        <>
          <dd className="mt-1 text-3xl font-bold tracking-tight text-accent">{k(d.median)}</dd>
          <dd className="mt-1 text-sm text-ink-2">
            Middle half: {k(d.p25)} to {k(d.p75)}
          </dd>
          <dd className="mt-0.5 text-xs text-ink-3">{note ?? `From ${d.n} postings`}</dd>
        </>
      ) : (
        <dd className="mt-1 text-sm text-ink-3">Not enough postings list this yet.</dd>
      )}
    </div>
  );
}

/** OTE distribution: one series, so no legend. Each bar has a hover title and the counts are in the table below it. */
export function OteHistogram({ h, median }: { h: SalaryStats["histogram"]; median: number | null }) {
  if (!h.length) return null;
  const max = Math.max(...h.map((b) => b.count));
  return (
    <figure className="rounded-xl border border-line bg-surface p-4">
      <figcaption className="mb-3 text-sm font-semibold">How OTE is spread across postings</figcaption>
      <div className="flex h-40 items-end gap-[2px]" role="img" aria-label="Histogram of posted OTE in $25K steps">
        {h.map((b) => {
          const hasMedian = median != null && median >= b.from && median < b.to;
          return (
            <div key={b.from} className="group relative flex h-full flex-1 flex-col justify-end" title={`${k(b.from)} to ${k(b.to)}: ${b.count} posting${b.count === 1 ? "" : "s"}`}>
              <div
                className={`rounded-t-[4px] ${hasMedian ? "bg-accent" : "bg-accent/45"} transition group-hover:bg-accent`}
                style={{ height: `${b.count ? Math.max(3, (b.count / max) * 100) : 0}%` }}
              />
              <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink px-1.5 py-0.5 text-[11px] text-white group-hover:block">
                {b.count}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-ink-3">
        <span>{k(h[0]!.from)}</span>
        {median != null && <span className="text-accent">Darker bar holds the median</span>}
        <span>{k(h[h.length - 1]!.to)}+</span>
      </div>
    </figure>
  );
}
