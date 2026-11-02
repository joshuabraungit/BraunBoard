// Deduplication. Spec section 9: combine source id, company, normalized title,
// normalized location and description similarity.

export function normalizeLocationKey(city: string | null, state: string | null, remote: string): string {
  if (remote === "Remote") return "remote-us";
  return [city, state].filter(Boolean).join("-").toLowerCase().replace(/[^a-z0-9-]+/g, "") || "unknown";
}

export function dedupeKey(companyId: string, titleNormalized: string, locationKey: string): string {
  return `${companyId}|${titleNormalized}|${locationKey}`;
}

function shingles(text: string, size = 5): Set<string> {
  const words = text.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i + size <= words.length; i++) out.add(words.slice(i, i + size).join(" "));
  return out;
}

/** Jaccard similarity of 5-word shingles, 0..1. */
export function descriptionSimilarity(a: string, b: string): number {
  const A = shingles(a);
  const B = shingles(b);
  if (!A.size || !B.size) return a.trim() === b.trim() ? 1 : 0;
  let inter = 0;
  for (const s of A) if (B.has(s)) inter++;
  return inter / (A.size + B.size - inter);
}

export const DUPLICATE_THRESHOLD = 0.85;

/**
 * Same role, different city: one company posting one job once per location. Same exact title,
 * same countries, same remote setup, posted within a week of each other, and the
 * descriptions match once place names are taken out. Titles count as the same when they only
 * differ by the place tacked on the end ("Territory Rep - San Luis Obispo, CA" vs
 * "Territory Rep - Ventura/Oxnard/Ojai, CA"): those still show as one card, open in N places.
 */
export const SAME_ROLE_DAYS = 7;

export interface RoleCandidate {
  title: string;
  title_normalized: string;
  markets: string[];
  remote_type: string;
  posted_at: string | null;
  description: string;
  places: string[];
}

function stripPlaces(text: string, places: string[]): string {
  let t = text;
  for (const p of places) {
    if (!p || p.length < 3) continue;
    t = t.replace(new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), " ");
  }
  return t;
}

const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The title with a trailing place taken off: " - San Luis Obispo, CA", " | Austin", " (Chicago)".
 * Only strips the last segment when it names one of the job's places or ends in a state code,
 * so "Account Executive - Enterprise" stays as it is.
 */
export function titleWithoutPlace(title: string, places: string[]): string {
  const t = title.trim().replace(/\s+/g, " ");
  const names = places.flatMap((p) => p.split(/[,/]/)).map((p) => p.trim()).filter((p) => p.length >= 3);
  const isPlace = (seg: string) =>
    /,\s*[A-Z]{2}\.?$/.test(seg.trim()) || names.some((n) => new RegExp(`(^|[^a-z])${esc(n)}([^a-z]|$)`, "i").test(seg));
  const paren = t.match(/^(.*\S)\s*\(([^()]*)\)$/);
  if (paren && isPlace(paren[2]!)) return titleWithoutPlace(paren[1]!, places);
  const dash = t.match(/^(.*?\S)\s+[-–—|:]\s+((?:(?!\s[-–—|:]\s).)+)$/);
  if (dash && isPlace(dash[2]!)) return dash[1]!;
  return t;
}

export function sameRole(a: RoleCandidate, b: RoleCandidate): boolean {
  if (a.title_normalized !== b.title_normalized) return false;
  const places = [...a.places, ...b.places];
  const t = (x: string) => titleWithoutPlace(x, places).toLowerCase();
  if (t(a.title) !== t(b.title)) return false;
  const raw = (x: string) => x.trim().toLowerCase().replace(/\s+/g, " ");
  const placeOnly = raw(a.title) !== raw(b.title);
  // A territory copy that doesn't state its setup can join one that does; remote vs. onsite stays apart.
  const setupMatches = a.remote_type === b.remote_type || (placeOnly && (a.remote_type === "Unknown" || b.remote_type === "Unknown"));
  if (!setupMatches) return false;
  if ([...a.markets].sort().join() !== [...b.markets].sort().join()) return false;
  // Titles that differ only by the place on the end are territory copies of one role. The
  // title says so on its own; base pay often varies by market and they roll out over weeks,
  // so the date and text checks below would wrongly split them.
  if (placeOnly) return true;
  if (a.posted_at && b.posted_at) {
    const gap = Math.abs(new Date(a.posted_at).getTime() - new Date(b.posted_at).getTime());
    if (gap > SAME_ROLE_DAYS * 86_400_000) return false;
  }
  return descriptionSimilarity(stripPlaces(a.description, places), stripPlaces(b.description, places)) >= DUPLICATE_THRESHOLD;
}
