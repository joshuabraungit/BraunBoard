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
  for (const [re, label] of SCOPES) if (re.test(locationRaw)) return label;
  return null;
}
