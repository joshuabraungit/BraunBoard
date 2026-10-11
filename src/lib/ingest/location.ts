// Location parsing + US filter. V1 is United States only.

import type { RemoteType } from "./types";

const US_STATES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado",
  CT: "Connecticut", DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky",
  LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota",
  OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia",
  WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};
const STATE_NAMES = Object.fromEntries(Object.entries(US_STATES).map(([k, v]) => [v.toLowerCase(), k]));

// Bare city names that show up without a state on ATS boards.
const US_CITIES: Record<string, string> = {
  "new york": "NY", "nyc": "NY", "san francisco": "CA", "sf": "CA", "los angeles": "CA", "chicago": "IL",
  "boston": "MA", "austin": "TX", "seattle": "WA", "denver": "CO", "atlanta": "GA", "miami": "FL",
  "dallas": "TX", "houston": "TX", "washington dc": "DC", "washington, d.c.": "DC", "philadelphia": "PA",
  "phoenix": "AZ", "salt lake city": "UT", "nashville": "TN", "raleigh": "NC", "san diego": "CA",
  "san jose": "CA", "palo alto": "CA", "mountain view": "CA", "boulder": "CO", "minneapolis": "MN",
  "portland": "OR", "pittsburgh": "PA", "detroit": "MI", "columbus": "OH", "charlotte": "NC",
};

const NON_US = /\b(canada|toronto|vancouver|montreal|uk|united kingdom|london|ireland|dublin|germany|berlin|munich|france|paris|netherlands|amsterdam|spain|madrid|india|bangalore|bengaluru|singapore|australia|sydney|melbourne|japan|tokyo|brazil|são paulo|sao paulo|mexico|emea|apac|latam|israel|tel aviv|poland|sweden|stockholm|switzerland|zurich)\b/i;
const US_MARKERS = /\b(united states|usa|u\.s\.a?\.?|us|north america|americas|nationwide)\b/i;

export interface ParsedLocation {
  city: string | null;
  state: string | null;
  country: string | null;
  remote_type: RemoteType;
  is_us: boolean;
}

export function parseRemoteType(text: string, hint?: RemoteType): RemoteType {
  if (hint && hint !== "Unknown") return hint;
  if (/\bhybrid\b/i.test(text)) return "Hybrid";
  if (/\b(remote|anywhere|distributed|work from home|wfh)\b/i.test(text)) return "Remote";
  if (/\b(on-?site|in[- ]office|office-based)\b/i.test(text)) return "Onsite";
  return "Unknown";
}

export function parseLocation(
  raw: string,
  hints: { country?: string | null; region?: string | null; city?: string | null; workplace?: RemoteType } = {},
): ParsedLocation {
  const text = raw.trim();
  const remote_type = parseRemoteType(text, hints.workplace);

  // Structured hints win when the ATS gives them (Ashby, sometimes Lever).
  const hintCountry = hints.country?.toLowerCase();
  if (hintCountry && /^(us|usa|united states)$/.test(hintCountry)) {
    const st = hints.region ? (US_STATES[hints.region.toUpperCase()] ? hints.region.toUpperCase() : STATE_NAMES[hints.region.toLowerCase()] ?? null) : null;
    return { city: hints.city ?? null, state: st, country: "US", remote_type, is_us: true };
  }

  // Multi-location strings ("NYC / London"): US if any part is US.
  const parts = text.split(/\s*(?:\/|;|\bor\b|\|)\s*/i).filter(Boolean);
  for (const part of parts.length ? parts : [text]) {
    const p = parsePart(part);
    if (p) return { ...p, remote_type, is_us: true };
  }

  if (NON_US.test(text)) return { city: null, state: null, country: null, remote_type, is_us: false };
  if (hintCountry) return { city: null, state: null, country: hints.country ?? null, remote_type, is_us: false };

  // "Remote" with no country at all: ambiguous. Keep it but flag via country=null.
  // The pipeline marks these needs_review so an admin can confirm.
  return { city: null, state: null, country: null, remote_type, is_us: remote_type === "Remote" && !NON_US.test(text) };
}

function parsePart(part: string): Omit<ParsedLocation, "remote_type" | "is_us"> | null {
  if (NON_US.test(part)) return null;

  // "City, ST" or "City, State"
  const m = part.match(/([A-Za-z .'-]+),\s*([A-Za-z .]+?)(?:,\s*(US|USA|United States))?\s*(?:\(|$|-)/);
  if (m) {
    const city = m[1].replace(/^(remote|hybrid)\s*[-–:]?\s*/i, "").trim();
    const st = m[2].trim();
    const code = US_STATES[st.toUpperCase()] ? st.toUpperCase() : STATE_NAMES[st.toLowerCase()];
    if (code) return { city: city || null, state: code, country: "US" };
  }

  const lower = part.toLowerCase();
  for (const [city, st] of Object.entries(US_CITIES)) {
    if (new RegExp(`\\b${city.replace(/[.,]/g, "\\$&")}\\b`).test(lower)) {
      return { city: city.replace(/\b\w/g, (c) => c.toUpperCase()), state: st, country: "US" };
    }
  }
  if (US_MARKERS.test(part)) return { city: null, state: null, country: "US" };
  return null;
}
