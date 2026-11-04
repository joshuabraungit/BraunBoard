// Remote roles open across Europe ("Remote - EU", "Europe (Remote)", "Remote, EMEA").
// Someone living in Germany can take these, so they show on the Germany board, labeled
// "Anywhere in the EU" (or Europe / EMEA, matching the posting) instead of "Germany".
// A role remote in one country ("Remote - Spain", "Remote, France or Netherlands") is not EU-wide.

const SCOPES: [RegExp, string][] = [
  [/\b(eu|european union|eu[- ]wide|eu[- ]based)\b/i, "Anywhere in the EU"],
  [/\b(europe|europe[- ]wide|european)\b/i, "Anywhere in Europe"],
  [/\bemea\b/i, "Anywhere in EMEA"],
];

// A specific country (other than Germany, which we already cover) narrows the role to that country.
const OTHER_COUNTRY =
  /\b(france|paris|spain|madrid|barcelona|italy|milan|netherlands|amsterdam|belgium|brussels|portugal|lisbon|ireland|dublin|poland|warsaw|sweden|stockholm|denmark|copenhagen|norway|oslo|finland|helsinki|austria|vienna|switzerland|zurich|czech\w*|prague|romania|greece|hungary|israel|uae|dubai|south africa|nordics?|benelux|uk&i)\b/i;

/** "Anywhere in the EU" for a remote role open across Europe, else null. */
export function euRemoteScope(locationRaw: string | null | undefined): string | null {
  if (!locationRaw || OTHER_COUNTRY.test(locationRaw)) return null;
  // "Remote, Germany, EMEA": EMEA is just the region tag on a Germany job.
  if (/\b(germany|deutschland)\b/i.test(locationRaw) && !/\b(eu|european union|europe|european)\b/i.test(locationRaw)) return null;
  for (const [re, label] of SCOPES) if (re.test(locationRaw)) return label;
  return null;
}

/**
 * The markets we store for a job. Remote roles open across Europe also get "EU", so people living
 * anywhere in Europe (not just Germany) can find them under "Remote across Europe".
 * "EU" is only a tag for the filter: it never decides pay, city or the country shown.
 */
export function withEuMarket(markets: readonly string[], remoteType: string | null | undefined, locationRaw: string | null | undefined): string[] {
  const base = markets.filter((m) => m !== "EU");
  return remoteType === "Remote" && base.includes("DE") && openAcrossEurope(locationRaw) ? [...base, "EU"] : base;
}

const EUROPEAN_COUNTRIES: [string, RegExp][] = [
  ["DE", /\b(germany|deutschland)\b/i], ["UK", /\b(uk|united kingdom|england|scotland|wales|great britain)\b/i],
  ["IE", /\bireland\b/i], ["FR", /\bfrance\b/i], ["ES", /\bspain\b/i], ["PT", /\bportugal\b/i], ["IT", /\bitaly\b/i],
  ["NL", /\bnetherlands\b/i], ["BE", /\bbelgium\b/i], ["AT", /\baustria\b/i], ["CH", /\bswitzerland\b/i],
  ["PL", /\bpoland\b/i], ["CZ", /\bczech/i], ["HU", /\bhungary\b/i], ["RO", /\bromania\b/i], ["GR", /\bgreece\b/i],
  ["SE", /\bsweden\b/i], ["DK", /\bdenmark\b/i], ["NO", /\bnorway\b/i], ["FI", /\bfinland\b/i],
];

/**
 * Remote and open to people across Europe: says EU / Europe / EMEA ("Remote, EMEA"), or lists three or
 * more European countries ("Austria, Remote; Germany, Remote; Poland, Remote"). Not "Remote, Germany, EMEA",
 * which is a Germany job with a region tag.
 */
export function openAcrossEurope(locationRaw: string | null | undefined): boolean {
  if (!locationRaw) return false;
  if (euRemoteScope(locationRaw)) return true;
  const countries = EUROPEAN_COUNTRIES.filter(([, re]) => re.test(locationRaw)).length;
  if (countries >= 3) return true;
  // "Remote - European Union / United Kingdom / Germany": a region named alongside a couple of countries.
  return countries >= 2 && /\b(eu|european union|europe|emea)\b/i.test(locationRaw);
}
