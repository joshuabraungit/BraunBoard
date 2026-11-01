import type { MatchResult } from "@/lib/match";

const ICON = { pass: "✓", fail: "✗", unknown: "?" } as const;
const TONE = { pass: "text-accent", fail: "text-fresh", unknown: "text-ink-3" } as const;

/**
 * How a job lines up with the watch, one criterion at a time. No percentage: with a simple watch
 * everything scores 100%, which says nothing and reads like attainment. The score still ranks For You.
 * On cards, only shown when something didn't match or isn't stated; on the job page, always.
 */
/** Whether a card has anything to show for this match (something didn't match, or isn't stated). */
export const matchShowsOnCard = (match: MatchResult) =>
  match.score != null && match.checks.length > 0 && !match.checks.every((c) => c.result === "pass");

export function MatchBadge({ match, detailed = false }: { match: MatchResult; detailed?: boolean }) {
  if (match.score == null || !match.checks.length) return null;
  if (!detailed && match.checks.every((c) => c.result === "pass")) return null;
  return (
    <div className={detailed ? "rounded-xl border border-line bg-surface p-4" : ""}>
      <ul className={`flex flex-wrap gap-x-3 gap-y-1 ${detailed ? "text-sm" : "mt-2 text-xs"}`}>
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
