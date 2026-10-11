import type { MatchResult } from "@/lib/match";

const ICON = { pass: "✓", fail: "✗", unknown: "?" } as const;
const TONE = { pass: "text-accent", fail: "text-fresh", unknown: "text-ink-3" } as const;

/** "94% Match" plus the per-criterion breakdown. Spec section 12: transparent, no black box. */
export function MatchBadge({ match, detailed = false }: { match: MatchResult; detailed?: boolean }) {
  if (match.score == null) return null;
  const strong = match.score >= 85;
  return (
    <div className={detailed ? "rounded-xl border border-line bg-surface p-4" : ""}>
      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${strong ? "bg-accent-soft text-accent" : "bg-bg text-ink-2 ring-1 ring-line"}`}>
        {match.score}% Match
      </span>
      <ul className={`flex flex-wrap gap-x-3 gap-y-1 text-xs ${detailed ? "mt-3 text-sm" : "mt-2"}`}>
        {match.checks.map((c) => (
          <li key={c.key} className={TONE[c.result]} title={c.result === "unknown" ? "Not stated in the posting, so it doesn't count against the job" : undefined}>
            {c.label} {ICON[c.result]}
          </li>
        ))}
      </ul>
      {detailed && match.checks.some((c) => c.result === "unknown") && (
        <p className="mt-2 text-xs text-ink-3">? means the posting doesn&apos;t say. Unknowns don&apos;t count against a job.</p>
      )}
    </div>
  );
}
