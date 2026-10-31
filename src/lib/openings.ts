import type { JobView } from "./data";
import { formatLocation } from "./format";

/**
 * Companies often post the same title in the same city more than once (separate openings, sometimes months apart).
 * In a list they look like duplicates, so show one card (the first one in the list) with a count.
 */
export function collapseOpenings(jobs: JobView[]): { job: JobView; openings: number }[] {
  const out: { job: JobView; openings: number }[] = [];
  const at = new Map<string, number>();
  for (const j of jobs) {
    const k = `${j.company_name}|${j.title_raw.trim().toLowerCase()}|${formatLocation(j)}`;
    const i = at.get(k);
    if (i == null) {
      at.set(k, out.length);
      out.push({ job: j, openings: 1 });
    } else out[i]!.openings++;
  }
  return out;
}
