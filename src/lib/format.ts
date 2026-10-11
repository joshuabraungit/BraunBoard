// Display formatting shared by cards, detail pages and emails.

export function money(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M`;
  return `$${Math.round(n / 1000)}K`;
}

function range(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null && min !== max) return `${money(min)}–${money(max)}`;
  return money((min ?? max)!);
}

/** "$150K–$175K base · $300K OTE". Empty string when nothing is published. */
export function formatComp(j: { salary_min: number | null; salary_max: number | null; ote_min: number | null; ote_max: number | null }): string {
  const base = range(j.salary_min, j.salary_max);
  const ote = range(j.ote_min, j.ote_max);
  return [base && `${base} base`, ote && `${ote} OTE`].filter(Boolean).join(" · ");
}

export function formatLocation(j: { remote_type: string; city: string | null; state: string | null; location_raw?: string | null }): string {
  const place = [j.city, j.state].filter(Boolean).join(", ");
  if (j.remote_type === "Remote") return place ? `Remote · US (${place})` : "Remote · US";
  if (j.remote_type === "Hybrid") return place ? `Hybrid · ${place}` : "Hybrid";
  return place || j.location_raw || "United States";
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}
