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
