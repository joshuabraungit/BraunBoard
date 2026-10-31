// Location parsing + market filter. Braun Board covers the United States, Canada and the UK.

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
  "new york": "NY", "nyc": "NY", "washington d.c.": "DC", "bay area": "CA", "sf bay area": "CA", "san francisco": "CA", "sf": "CA", "los angeles": "CA", "chicago": "IL",
  "boston": "MA", "austin": "TX", "seattle": "WA", "denver": "CO", "atlanta": "GA", "miami": "FL",
  "dallas": "TX", "houston": "TX", "washington dc": "DC", "washington, d.c.": "DC", "philadelphia": "PA",
  "phoenix": "AZ", "salt lake city": "UT", "nashville": "TN", "raleigh": "NC", "san diego": "CA",
  "san jose": "CA", "palo alto": "CA", "mountain view": "CA", "boulder": "CO", "minneapolis": "MN",
  "portland": "OR", "pittsburgh": "PA", "detroit": "MI", "columbus": "OH", "charlotte": "NC",
};

// ---- Canada -------------------------------------------------------------
const CA_PROVINCES: Record<string, string> = {
  ON: "Ontario", BC: "British Columbia", QC: "Quebec", AB: "Alberta", MB: "Manitoba", SK: "Saskatchewan",
  NS: "Nova Scotia", NB: "New Brunswick", NL: "Newfoundland and Labrador", PE: "Prince Edward Island",
  YT: "Yukon", NT: "Northwest Territories", NU: "Nunavut",
};
const PROVINCE_NAMES: Record<string, string> = {
  ...Object.fromEntries(Object.entries(CA_PROVINCES).map(([k, v]) => [v.toLowerCase(), k])),
  "québec": "QC", "newfoundland": "NL", "pei": "PE",
};
const CA_CITIES: Record<string, string> = {
  toronto: "ON", "greater toronto area": "ON", gta: "ON", ottawa: "ON", mississauga: "ON", "kitchener-waterloo": "ON",
  kitchener: "ON", hamilton: "ON", london: "ON", markham: "ON", vancouver: "BC", victoria: "BC", burnaby: "BC",
  montreal: "QC", "montréal": "QC", "quebec city": "QC", "québec city": "QC", calgary: "AB", edmonton: "AB",
  winnipeg: "MB", halifax: "NS", saskatoon: "SK", regina: "SK",
};
// "London" alone means the UK; only "London, ON" counts as Canada (handled by the "City, Province" rule).
const CA_BARE_CITIES = Object.keys(CA_CITIES).filter((c) => c !== "london" && c !== "victoria" && c !== "hamilton");
const CA_MARKERS = /\b(canada|canadian|can\b)/i;

export type Market = "US" | "CA" | "UK";
const MARKET_ORDER: Market[] = ["US", "CA", "UK"];

// ---- United Kingdom -----------------------------------------------------
const UK_NATIONS: Record<string, string> = { england: "England", scotland: "Scotland", wales: "Wales", "northern ireland": "Northern Ireland" };
// Cities that are clearly the UK on their own. Ambiguous ones (Cambridge, Birmingham, Manchester,
// Reading, Bristol...) only count with a UK marker, since US "City, ST" parsing runs first anyway.
const UK_SAFE_CITIES = ["london", "edinburgh", "glasgow", "belfast", "cardiff", "leeds", "liverpool", "sheffield", "milton keynes", "nottingham", "brighton", "aberdeen", "newcastle upon tyne"];
const UK_CITIES = [...UK_SAFE_CITIES, "manchester", "birmingham", "bristol", "cambridge", "oxford", "reading", "newcastle", "bath", "york", "southampton", "leicester", "coventry", "guildford", "slough", "watford"];
const UK_MARKERS = /\b(united kingdom|great britain|u\.k\.?|uk|gb|gbr|uk&i|uki|england|scotland|northern ireland)\b|(?<!new south )\bwales\b/i;
// Places that borrow UK names.
const NOT_UK = /\b(new south wales|nsw|australia|ontario|canada|new england|new york)\b/i;

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

// Short or slangy names job boards use, shown the way people write them.
const CITY_ALIASES: Record<string, string> = {
  nyc: "New York", "new york city": "New York City", sf: "San Francisco", "sf bay area": "Bay Area",
  la: "Los Angeles", "washington dc": "Washington", "washington d.c.": "Washington", "washington, d.c.": "Washington",
  gta: "Greater Toronto Area",
};
const KNOWN_CITIES = [...Object.keys(US_CITIES), ...Object.keys(CA_CITIES), ...UK_CITIES].sort((a, b) => b.length - a.length);

/**
 * The city as people would write it, or null when it isn't a city at all:
 * a country ("US"), a state code ("NC"), a street address, "Remote".
 */
export function cleanCity(city: string | null | undefined): string | null {
  const c = city?.trim().replace(/\s+/g, " ");
  if (!c) return null;
  const lower = c.toLowerCase();
  if (/^(us|usa|u\.s\.a?\.?|united states( of america)?|canada|uk|united kingdom|remote|hybrid|anywhere|flexible|n\/a|tbd)$/i.test(c)) return null;
  if (/^[A-Za-z]{2}$/.test(c) && (US_STATES[c.toUpperCase()] || CA_PROVINCES[c.toUpperCase()]) && !CITY_ALIASES[lower]) return null;
  if (CITY_ALIASES[lower]) return CITY_ALIASES[lower]!;
  // A street address: keep the city it ends with, if we know it.
  if (/\d/.test(c)) {
    const known = KNOWN_CITIES.find((k) => new RegExp(`(^|[^a-z])${k.replace(/[.,]/g, "\\$&")}$`).test(lower));
    return known ? CITY_ALIASES[known] ?? titleCase(known) : null;
  }
  // "new york" -> "New York"; leave mixed case alone ("McAllen", "St. Louis").
  return c === lower ? titleCase(c) : c;
}

/** "Redwood City, US, California" -> "Redwood City, California": drop the country wedged between city and state. */
const dropMiddleCountry = (part: string) => part.replace(/,\s*(?:US|USA|United States)\s*,/gi, ",");

/** UK-only parsing of one location fragment. */
function parseUkPart(part: string): { city: string | null; state: string | null; country: "UK" } | null {
  if (NOT_UK.test(part)) return null;
  const lower = part.toLowerCase();
  const marked = UK_MARKERS.test(part);
  const has = (c: string) => new RegExp(`(^|[^a-z])${c}([^a-z]|$)`).test(lower);
  const city = UK_CITIES.find((c) => has(c) && (marked || UK_SAFE_CITIES.includes(c)));
  if (city) return { city: titleCase(city.replace(/ upon tyne$/, "")), state: null, country: "UK" };
  if (marked) {
    const nation = Object.keys(UK_NATIONS).find((n) => has(n));
    return { city: null, state: nation ? UK_NATIONS[nation]! : null, country: "UK" };
  }
  return null;
}

/** Canada-only parsing of one location fragment. */
function parseCaPart(part: string): { city: string | null; state: string | null; country: "CA" } | null {
  const m = part.match(/([A-Za-zÀ-ÿ .'-]+),\s*([A-Za-zÀ-ÿ .]+?)(?:,\s*(CA|CAN|Canada))?\s*(?:\(|$|-|,)/);
  if (m) {
    const city = m[1].replace(/^(remote|hybrid)\s*[-–:]?\s*/i, "").replace(/^(remote|hybrid|flexible|anywhere)$/i, "").trim();
    const pv = m[2].trim();
    const code = CA_PROVINCES[pv.toUpperCase()] && pv.toUpperCase() !== "CA" ? pv.toUpperCase() : PROVINCE_NAMES[pv.toLowerCase()];
    if (code) return { city: city || null, state: code, country: "CA" };
    if (/^(canada|can)$/i.test(pv)) {
      const c = city.toLowerCase();
      return { city: city || null, state: CA_CITIES[c] ?? null, country: "CA" };
    }
  }
  const lower = part.toLowerCase();
  for (const city of CA_BARE_CITIES) {
    if (new RegExp(`(^|[^a-zà-ÿ])${city}([^a-zà-ÿ]|$)`).test(lower)) {
      return { city: city.split(" ").map((w) => w[0]!.toUpperCase() + w.slice(1)).join(" "), state: CA_CITIES[city]!, country: "CA" };
    }
  }
  for (const [name, code] of Object.entries(PROVINCE_NAMES)) {
    if (new RegExp(`\\b${name}\\b`).test(lower)) return { city: null, state: code, country: "CA" };
  }
  if (CA_MARKERS.test(part)) return { city: null, state: null, country: "CA" };
  return null;
}

const NON_US = /\b(canada|toronto|vancouver, (bc|british columbia)|montreal|ontario|quebec|uk|u\.k\.|united kingdom|england|scotland|london|ireland|dublin|uk&i|germany|berlin|munich|france|paris|netherlands|amsterdam|belgium|spain|madrid|barcelona|portugal|lisbon|italy|milan|denmark|copenhagen|norway|oslo|sweden|stockholm|finland|helsinki|switzerland|zurich|austria|vienna|poland|warsaw|czech|prague|romania|ukraine|turkey|istanbul|israel|tel aviv|uae|dubai|abu dhabi|saudi|riyadh|qatar|egypt|south africa|nigeria|kenya|india|bangalore|bengaluru|hyderabad|pune|mumbai|delhi|gurgaon|gurugram|noida|chennai|pakistan|singapore|malaysia|indonesia|jakarta|thailand|bangkok|vietnam|philippines|manila|hong kong|china|beijing|shanghai|shenzhen|taiwan|taipei|korea|seoul|japan|tokyo|australia|sydney|melbourne|new zealand|auckland|anz|brazil|são paulo|sao paulo|mexico|mexico city|colombia|bogot[aá]|argentina|buenos aires|chile|santiago|peru|lima|costa rica|latam|latin america|emea|apac|asia|europe|nordics|dach|benelux)\b/i;
const US_MARKERS = /\b(united states|usa|u\.s\.a?\.?|us|north america|americas|nationwide)\b/i;

const US_REGION_WORDS = /^(us|usa|u\.s\.a?\.?|united states|north america|americas|anywhere in (the )?us|(us[ -])?(east|west|central|midwest|mid-?west|northeast|north east|southeast|south east|southwest|south west|northwest|north west|pacific|mountain|east coast|west coast|south|north)( coast| region| time ?zones?)?|(eastern|central|pacific|mountain) time( ?zone)?|est|cst|pst|mst|et|ct|pt|mt)$/i;

/** "Remote - Colombia" -> "Colombia". Null when there's no qualifier. */
function remoteQualifier(part: string): string | null {
  const m = part.match(/\bremote\b\s*(?:[-–—:,|]\s*|\()\s*([^)]+?)\)?\s*$/i) ?? part.match(/^\s*([^-–(]+?)\s*[-–(]\s*remote\b/i);
  return m ? m[1].trim() : null;
}

function isUsQualifier(q: string): boolean {
  const t = q.replace(/^(us|usa)\s*[-–]\s*/i, "").trim();
  if (US_REGION_WORDS.test(q.trim()) || US_REGION_WORDS.test(t)) return true;
  if (US_STATES[t.toUpperCase()] || STATE_NAMES[t.toLowerCase()]) return true;
  if (US_MARKERS.test(q)) return true;
  if (/\b(d\.?\s?c\.?|bay area|tri-?state|new england|pacific northwest|pnw|dmv)\b/i.test(q)) return true;
  // A US city or "City, ST" works too ("Remote - Austin, TX", "Remote - NYC")
  return !NON_US.test(q) && parsePart(q) != null;
}

export interface ParsedLocation {
  city: string | null;
  state: string | null;
  country: string | null;
  remote_type: RemoteType;
  /** Open to candidates in the US. */
  is_us: boolean;
  /** Every market (US, Canada) the job is open in. Empty = out of scope. */
  markets: Market[];
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
  const out = (p: { city: string | null; state: string | null; country: string | null }, markets: Market[]): ParsedLocation => ({
    ...p,
    city: cleanCity(p.city),
    remote_type,
    markets,
    is_us: markets.includes("US"),
  });

  // Every market named anywhere in the string ("Remote - US / Remote - Canada" is both).
  const parts = text.split(/\s*(?:\/|;|\bor\b|\||•)\s*/i).filter(Boolean).map(dropMiddleCountry);
  const markets = new Set<Market>();
  let usPlace: Omit<ParsedLocation, "remote_type" | "is_us" | "markets"> | null = null;
  let caPlace: ReturnType<typeof parseCaPart> = null;
  let ukPlace: ReturnType<typeof parseUkPart> = null;
  let foreignQualifier = false;
  for (const part of parts.length ? parts : [text]) {
    const q = remoteQualifier(part);
    if (q && !isUsQualifier(q)) {
      const ca = parseCaPart(q);
      const uk = ca ? null : parseUkPart(q);
      if (ca) {
        markets.add("CA");
        caPlace ??= ca;
      } else if (uk) {
        markets.add("UK");
        ukPlace ??= uk;
      } else foreignQualifier = true;
      continue;
    }
    const p = parsePart(part);
    if (p) {
      markets.add("US");
      usPlace ??= p;
      continue;
    }
    const ca = parseCaPart(part);
    if (ca) {
      markets.add("CA");
      caPlace ??= ca;
      continue;
    }
    const uk = parseUkPart(part);
    if (uk) {
      markets.add("UK");
      ukPlace ??= uk;
    }
  }

  // Structured hints win when the ATS gives them (Ashby, Lever, Workday).
  const hintCountry = hints.country?.trim().toLowerCase();
  if (hintCountry && /^(us|usa|u\.s\.a?\.?|united states( of america)?)$/.test(hintCountry)) {
    const st = hints.region ? (US_STATES[hints.region.toUpperCase()] ? hints.region.toUpperCase() : STATE_NAMES[hints.region.toLowerCase()] ?? null) : null;
    const city = hints.city && !/^(remote|hybrid|anywhere|)$/i.test(hints.city.trim()) ? hints.city : null;
    markets.add("US");
    return out({ city, state: st, country: "US" }, MARKET_ORDER.filter((m) => markets.has(m)));
  }
  if (hintCountry && /^(ca|can|canada)$/.test(hintCountry)) {
    const region = hints.region?.trim() ?? "";
    const st = CA_PROVINCES[region.toUpperCase()] ? region.toUpperCase() : PROVINCE_NAMES[region.toLowerCase()] ?? null;
    const city = hints.city && !/^(remote|hybrid|anywhere|)$/i.test(hints.city.trim()) ? hints.city : null;
    markets.add("CA");
    const list = MARKET_ORDER.filter((m) => markets.has(m));
    if (markets.has("US") && usPlace) return out(usPlace, list);
    return out({ city, state: st, country: "CA" }, list);
  }

  if (hintCountry && /^(gb|gbr|uk|united kingdom|great britain|england|scotland|wales|northern ireland)$/.test(hintCountry)) {
    // Some boards put the nation in the city field ("England"); that's not a city.
    const city = hints.city && !/^(remote|hybrid|anywhere|uk|united kingdom|great britain|england|scotland|wales|northern ireland|)$/i.test(hints.city.trim()) ? hints.city : null;
    markets.add("UK");
    const list = MARKET_ORDER.filter((m) => markets.has(m));
    if (usPlace) return out(usPlace, list);
    if (caPlace) return out(caPlace, list);
    return out({ city: city ?? ukPlace?.city ?? null, state: ukPlace?.state ?? null, country: "UK" }, list);
  }

  const list = MARKET_ORDER.filter((m) => markets.has(m));
  if (usPlace) return out(usPlace, list);
  if (caPlace) return out(caPlace, list);
  if (ukPlace) return out(ukPlace, list);
  if (foreignQualifier || NON_US.test(text) || hintCountry) return out({ city: null, state: null, country: hintCountry ? hints.country ?? null : null }, []);

  // "Remote" with no country at all: ambiguous. Keep it as US but flag via country=null.
  // The pipeline marks these needs_review so an admin can confirm.
  return out({ city: null, state: null, country: null }, remote_type === "Remote" ? ["US"] : []);
}

function parsePart(part: string): Omit<ParsedLocation, "remote_type" | "is_us" | "markets"> | null {
  if (NON_US.test(part)) return null;

  // "City, ST" or "City, State"
  const m = part.match(/([A-Za-z .'-]+),\s*([A-Za-z .]+?)(?:,\s*(US|USA|United States))?\s*(?:\(|$|-)/);
  if (m) {
    const city = m[1].replace(/^(remote|hybrid)\s*[-–:]?\s*/i, "").replace(/^(remote|hybrid|flexible|anywhere)$/i, "").trim();
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

const CANADA_IN_TITLE = /\b(canada|canadian|toronto|montr[eé]al|vancouver|ontario|qu[eé]bec|calgary|ottawa|edmonton|waterloo|gta)\b/i;
const FOREIGN_IN_TITLE =
  /\b(emea|apac|apj|latam|saarc|mea|sea|uk&i|united kingdom|uk|london|dublin|ireland|germany|dach|france|paris|berlin|munich|amsterdam|benelux|nordics?|australia|anz|sydney|melbourne|singapore|japan|tokyo|india|bangalore|mexico|brazil|s[aã]o paulo|israel|spain|madrid|italy|milan)\b/i;
const US_IN_TITLE = /\b(us|u\.s\.?|usa|united states|north america|americas|new england|east coast|west coast)\b/i;

const UK_IN_TITLE = /\b(uk|u\.k\.|united kingdom|uk&i|uki|britain|london|england|scotland|edinburgh|manchester)\b/i;
// Territories a UK-based seller wouldn't cover. Europe-wide titles (DACH, Nordics, EMEA) are often
// sold from London, so those stay in for UK jobs.
const OUTSIDE_EUROPE_IN_TITLE = /\b(apac|apj|latam|saarc|sea|asia|australia|anz|sydney|melbourne|singapore|japan|tokyo|india|bangalore|mexico|brazil|s[aã]o paulo|middle east|mena|africa)\b/i;

/** A title like "Enterprise AE, UK&I" is a UK role even if the location field lists other offices. */
export function titleNamesUkOnly(title: string): boolean {
  return UK_IN_TITLE.test(title) && !US_IN_TITLE.test(title) && !CANADA_IN_TITLE.test(title) && !OUTSIDE_EUROPE_IN_TITLE.test(title);
}

/** The UK place a title names, or failing that the UK office in the location field. */
export function ukPlaceFromTitle(title: string, location = ""): { city: string | null; state: string | null } {
  const t = parseUkPart(title);
  const p = (t?.city ? t : null) ?? location.split(/\s*(?:\/|;|\bor\b|\||•)\s*/i).map(parseUkPart).find((x) => x?.city) ?? t;
  return { city: p?.city ?? null, state: p?.state ?? null };
}

/**
 * Whether the title points at a territory this job's markets don't cover.
 * US / Canada jobs: any foreign territory ("AE, EMEA"). UK-only jobs: only territories outside Europe.
 */
/** The location names a place outside the US, Canada and UK (e.g. "Bangalore, India"). */
export function namesForeignPlace(location: string): boolean {
  const parts = location.split(/\s*(?:\/|;|\bor\b|\||•)\s*/i).filter(Boolean);
  return parts.some((p) => NON_US.test(p) && !parseUkPart(p) && !parseCaPart(p));
}

export function titleOutOfMarket(title: string, markets: readonly Market[]): boolean {
  if (markets.length === 1 && markets[0] === "UK") return OUTSIDE_EUROPE_IN_TITLE.test(title);
  return titleNamesForeignOnly(title);
}

/** A title like "Enterprise AE, EMEA" names a territory outside the US and Canada, and no US one. */
export function titleNamesForeignOnly(title: string): boolean {
  return FOREIGN_IN_TITLE.test(title) && !US_IN_TITLE.test(title) && !CANADA_IN_TITLE.test(title);
}

/** A title like "Senior Majors AE, Toronto" is a Canada role even if the location says "Distributed". */
export function titleNamesCanadaOnly(title: string): boolean {
  return CANADA_IN_TITLE.test(title) && !US_IN_TITLE.test(title) && !FOREIGN_IN_TITLE.test(title);
}

/** The Canadian place a title names, if any ("..., Toronto" -> Toronto, ON). */
export function canadaPlaceFromTitle(title: string): { city: string | null; state: string | null } {
  const p = parseCaPart(title);
  return { city: p?.city ?? null, state: p?.state ?? null };
}
