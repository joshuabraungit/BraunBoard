import type { JobView } from "./data";
import { formatLocation } from "./format";

export interface Collapsed {
  job: JobView;
  /** How many listings this card stands for. */
  openings: number;
  /** How many different places those listings are in. */
  locations: number;
}

/**
 * One card per role. Two cases look like duplicates in a list:
 * - the same title in the same city posted more than once (separate openings, sometimes months apart)
 * - one role posted once per city (the crawler links those with role_group)
 * Either way, show one card (the first one in the list) with a count.
 */
export function collapseOpenings(jobs: JobView[]): Collapsed[] {
  const out: Collapsed[] = [];
  const places: Set<string>[] = [];
  const at = new Map<string, number>();
  const sameCityKey = (j: JobView) => `${j.company_name}|${j.title_raw.trim().toLowerCase()}|${formatLocation(j)}`;
  for (const j of jobs) {
    const keys = [sameCityKey(j), `role:${j.role_group ?? j.id}`];
    const i = keys.map((k) => at.get(k)).find((x) => x != null);
    if (i == null) {
      for (const k of keys) at.set(k, out.length);
      places.push(new Set([formatLocation(j)]));
      out.push({ job: j, openings: 1, locations: 1 });
    } else {
      for (const k of keys) if (!at.has(k)) at.set(k, i);
      out[i]!.openings++;
      places[i]!.add(formatLocation(j));
      out[i]!.locations = places[i]!.size;
    }
  }
  return out;
}

/** "3 openings" for the same city, "Open in 4 locations" when it's one role in several places. */
export function openingsLabel(c: Pick<Collapsed, "openings" | "locations">): string | null {
  if (c.openings <= 1) return null;
  if (c.locations > 1) return `Open in ${c.locations} locations`;
  return `${c.openings} openings`;
}
