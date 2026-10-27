import type { JobView } from "./data";
import { fitsSize, openInCountries, scoreMatch, type MatchResult, type WatchPrefs } from "./match";

export interface Ranked {
  jobs: JobView[];
  matches: Map<string, MatchResult>;
  blocked: number;
}

/** Score jobs against a watch and keep the ones worth showing, best first. */
export function rankForWatch(jobs: JobView[], prefs: WatchPrefs, hidden: Set<string> = new Set(), minScore = 60): Ranked {
  const matches = new Map<string, MatchResult>();
  let blocked = 0;
  const kept: JobView[] = [];
  for (const j of jobs) {
    if (hidden.has(j.id) || !openInCountries(j, prefs) || !fitsSize(j, prefs)) continue;
    const m = scoreMatch(j, prefs);
    // Wrong role never counts, not even as "hidden by dealbreakers".
    if (m.checks.some((c) => c.key === "role" && c.result === "fail")) continue;
    if (m.score == null) {
      blocked++;
      continue;
    }
    if (m.score < minScore) continue;
    matches.set(j.id, m);
    kept.push(j);
  }
  kept.sort((a, b) => matches.get(b.id)!.score! - matches.get(a.id)!.score! || b.first_seen_at.localeCompare(a.first_seen_at));
  return { jobs: kept, matches, blocked };
}
