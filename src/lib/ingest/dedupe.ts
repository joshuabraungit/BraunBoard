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
 * descriptions match once place names are taken out. A title that names its own city or
 * territory ("Territory Manager - Memphis") is a separate seat, so different titles never match.
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

export function sameRole(a: RoleCandidate, b: RoleCandidate): boolean {
  if (a.title_normalized !== b.title_normalized) return false;
  const t = (x: string) => x.trim().toLowerCase().replace(/\s+/g, " ");
  if (t(a.title) !== t(b.title)) return false;
  if (a.remote_type !== b.remote_type) return false;
  if ([...a.markets].sort().join() !== [...b.markets].sort().join()) return false;
  if (a.posted_at && b.posted_at) {
    const gap = Math.abs(new Date(a.posted_at).getTime() - new Date(b.posted_at).getTime());
    if (gap > SAME_ROLE_DAYS * 86_400_000) return false;
  }
  const places = [...a.places, ...b.places];
  return descriptionSimilarity(stripPlaces(a.description, places), stripPlaces(b.description, places)) >= DUPLICATE_THRESHOLD;
}
