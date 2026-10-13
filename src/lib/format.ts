// Display formatting shared by cards, detail pages and emails.

/** "$150K", "C$150K" for Canadian dollars, "£150K" for pounds, so it's never mistaken for USD. */
export function money(n: number, currency?: string | null): string {
  const sym = currency === "CAD" ? "C$" : currency === "GBP" ? "£" : "$";
  if (n >= 1_000_000) return `${sym}${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M`;
  return `${sym}${Math.round(n / 1000)}K`;
}

function range(min: number | null, max: number | null, currency?: string | null): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null && min !== max) return `${money(min, currency)}–${money(max, currency)}`;
  return money((min ?? max)!, currency);
}

/** "$150K–$175K base · $300K OTE". Empty string when nothing is published. */
export function formatComp(j: { salary_min: number | null; salary_max: number | null; ote_min: number | null; ote_max: number | null; currency?: string | null }): string {
  const base = range(j.salary_min, j.salary_max, j.currency);
  const ote = range(j.ote_min, j.ote_max, j.currency);
  return [base && `${base} base`, ote && `${ote} OTE`].filter(Boolean).join(" · ");
}

const MARKET_NAME: Record<string, string> = { US: "US", CA: "Canada", UK: "UK" };

export function formatLocation(j: { remote_type: string; city: string | null; state: string | null; location_raw?: string | null; markets?: string[] | null }): string {
  const place = [j.city, j.state].filter(Boolean).join(", ");
  const m = j.markets?.length ? j.markets : ["US"];
  const names = m.map((x) => MARKET_NAME[x] ?? x);
  // "US", "US & Canada", "US, Canada & UK"
  const where = names.length > 2 ? `${names.slice(0, -1).join(", ")} & ${names.at(-1)}` : names.join(" & ");
  // The city shown belongs to the first market (US, then Canada, then UK).
  const primary = m.includes("US") ? "US" : m.includes("CA") ? "CA" : "UK";
  const others = m.filter((x) => x !== primary).map((x) => MARKET_NAME[x] ?? x);
  // For remote roles a single city from the ATS is usually just the HQ or a placeholder. Don't imply it's required.
  if (j.remote_type === "Remote") return `Remote · ${where}`;
  if (j.remote_type === "Hybrid") return place ? `Hybrid · ${place}${where !== "US" ? `, ${where}` : ""}` : `Hybrid · ${where}`;
  if (place) return `${primary === "US" ? place : `${place}, ${MARKET_NAME[primary]}`}${others.length ? ` + ${others.join(" & ")}` : ""}`;
  return j.location_raw || (where === "US" ? "United States" : where);
}

const LANGUAGES = "German|French|Dutch|Spanish|Italian|Portuguese|Swedish|Danish|Norwegian|Finnish|Polish|Arabic|Hebrew|Japanese|Mandarin|Korean|Nordic";
const LANGUAGE_IN_TITLE = new RegExp(`\\b(${LANGUAGES})[- ](speaking|speaker)\\b|\\b(?:speaks?|fluent in) (${LANGUAGES})\\b`, "i");

/** "Dutch speaking" from titles like "Enterprise AE - Dutch Speaker", common for London roles covering Europe. */
export function languageFor(title: string): string | null {
  const m = title.match(LANGUAGE_IN_TITLE);
  const lang = m?.[1] ?? m?.[3];
  return lang ? `${lang[0]!.toUpperCase()}${lang.slice(1).toLowerCase()} speaking` : null;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}
