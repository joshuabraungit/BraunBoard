// Display formatting shared by cards, detail pages and emails.

/** "$150K", or "C$150K" for Canadian dollars so it's never mistaken for USD. */
export function money(n: number, currency?: string | null): string {
  const sym = currency === "CAD" ? "C$" : "$";
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

export function formatLocation(j: { remote_type: string; city: string | null; state: string | null; location_raw?: string | null; markets?: string[] | null }): string {
  const place = [j.city, j.state].filter(Boolean).join(", ");
  const m = j.markets?.length ? j.markets : ["US"];
  const where = m.includes("US") && m.includes("CA") ? "US & Canada" : m.includes("CA") ? "Canada" : "US";
  // For remote roles a single city from the ATS is usually just the HQ or a placeholder. Don't imply it's required.
  if (j.remote_type === "Remote") return `Remote · ${where}`;
  if (j.remote_type === "Hybrid") return place ? `Hybrid · ${place}${where !== "US" ? `, ${where === "Canada" ? "Canada" : "US & Canada"}` : ""}` : `Hybrid · ${where}`;
  if (place) return where === "Canada" ? `${place}, Canada` : where === "US & Canada" ? `${place} + Canada` : place;
  return j.location_raw || (where === "US" ? "United States" : where);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}
