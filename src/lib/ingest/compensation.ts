// Compensation parsing. Trust rule (spec section 8): never invent pay.
// We only record numbers that are explicitly published, and only label a
// range as OTE when the posting itself calls it OTE / on-target earnings.

export interface Compensation {
  salary_min: number | null;
  salary_max: number | null;
  ote_min: number | null;
  ote_max: number | null;
  currency: string | null;
}

const EMPTY: Compensation = { salary_min: null, salary_max: null, ote_min: null, ote_max: null, currency: null };

// $150,000 - $175,000 | $150K–$175K | $150k to $175k | USD 150,000 - 175,000
// The currency symbol is a parameter: "$" for US / Canada jobs, "£" for UK jobs.
const FIG = String.raw`(\d{2,3}(?:,\d{3})+|\d{2,3}(?:\.\d+)?\s?[kK])`;
function payRegexes(sym: "$" | "£") {
  const s = sym === "$" ? String.raw`(?:USD\s*)?\$?` : String.raw`(?:GBP\s*)?£?`;
  const strict = sym === "$" ? String.raw`\$` : String.raw`(?:£|GBP\s?)`;
  return {
    range: new RegExp(String.raw`${s}\s?${FIG}\s*(?:-|–|—|to)\s*${s}\s?${FIG}`, "g"),
    // Single figure: "$300K OTE", "£120K OTE"
    single: new RegExp(String.raw`${strict}\s?${FIG}`, "g"),
  };
}
const PAY = { $: payRegexes("$"), "£": payRegexes("£") };

const OTE_WORDS = /\b(ote|on[- ]target[- ]earnings?|on[- ]target compensation|target(ed)? total (cash|compensation)|total target(ed)? (cash|compensation))\b/i;
const BASE_WORDS = /\b(base|base salary|base pay|salary range|annual salary)\b/i;

function toNumber(s: string): number {
  const t = s.replace(/[\s,$£]/g, "").toLowerCase();
  return t.endsWith("k") ? Math.round(parseFloat(t) * 1000) : parseInt(t, 10);
}

function lastIndexOf(text: string, re: RegExp): number {
  let idx = -1;
  for (const m of text.matchAll(new RegExp(re.source, "gi"))) {
    // "comprised of base compensation and commissions" describes OTE, it isn't a base label.
    const after = text.slice(m.index! + m[0].length, m.index! + m[0].length + 40);
    if (re === BASE_WORDS) {
      // "base + variable", "base salary and on target incentive pay": describes what OTE is made of.
      if (/^\s*(salary|pay|compensation)?\s*(,|and\b|plus\b|\+|&)/i.test(after)) continue;
      // "The OTE salary range is ...": the base-ish word is part of an OTE label.
      if (OTE_WORDS.test(text.slice(Math.max(0, m.index! - 25), m.index!))) continue;
    }
    idx = m.index!;
  }
  return idx;
}

function plausible(n: number) {
  return n >= 20_000 && n <= 2_000_000;
}

interface Found {
  min: number;
  max: number;
  label: "ote" | "base" | "unlabeled";
}

/** Finds explicitly labeled pay figures in description text. */
export function findPayInText(text: string, sym: "$" | "£" = "$"): Found[] {
  const { range: RANGE, single: SINGLE } = PAY[sym];
  const out: Found[] = [];
  const seen = new Set<number>();
  const label = (idx: number, len: number): Found["label"] => {
    // Look at a small window around the figure for the label.
    const before = text.slice(Math.max(0, idx - 300), idx);
    const after = text.slice(idx + len, idx + len + 60);
    // Label directly after the figure: "$300K OTE", "$150K base"
    const nearAfter = after.match(/^[\s(]*([a-z -]{0,50})/i)?.[1] ?? "";
    if (new RegExp("^" + OTE_WORDS.source, "i").test(nearAfter)) return "ote";
    // "$74K - $112K total target cash", "$240K-$300K potential total on target earnings"
    if (new RegExp("^(potential |estimated |annual )?(total )?" + OTE_WORDS.source, "i").test(nearAfter)) return "ote";
    // "$130K-$160K base" right after the number beats any label further back.
    if (new RegExp("^" + BASE_WORDS.source, "i").test(nearAfter)) return "base";
    // The closest label before the number wins
    const lastOte = lastIndexOf(before, OTE_WORDS);
    const lastBase = lastIndexOf(before, BASE_WORDS);
    if (lastOte >= 0 && lastOte > lastBase) return "ote";
    if (lastBase >= 0) return "base";
    // Some postings explain once, well above per-zone ranges, that the ranges are total target cash.
    const wide = text.slice(Math.max(0, idx - 900), idx);
    const farOte = lastIndexOf(wide, OTE_WORDS);
    if (farOte >= 0 && farOte > lastIndexOf(wide, BASE_WORDS)) return "ote";
    return "unlabeled";
  };

  for (const m of text.matchAll(RANGE)) {
    const min = toNumber(m[1]);
    const max = toNumber(m[2]);
    if (!plausible(min) || !plausible(max) || max < min) continue;
    out.push({ min, max, label: label(m.index!, m[0].length) });
    for (let i = m.index!; i < m.index! + m[0].length; i++) seen.add(i);
  }
  for (const m of text.matchAll(SINGLE)) {
    if (seen.has(m.index!)) continue;
    const n = toNumber(m[1]);
    if (!plausible(n)) continue;
    const l = label(m.index!, m[0].length);
    // Single figures are only trusted when explicitly labeled OTE.
    if (l === "ote") out.push({ min: n, max: n, label: "ote" });
  }
  return out;
}

/**
 * Combine the ATS's structured salary (if any) with labeled figures in the text.
 * - Structured ranges count as base unless the text labels that same range as OTE.
 * - Unlabeled text ranges are ignored for sales roles because we can't tell base from OTE.
 */
/** Ranges like "$14K – $214K" are data-entry noise, not a real band. Don't show them. */
export function plausibleRange(min: number, max: number): boolean {
  return min >= 30_000 && max >= min && max / min <= 3;
}

export function resolveCompensation(
  structured: { min: number | null; max: number | null; currency: string | null; isOte?: boolean },
  description: string,
  sym: "$" | "£" = "$",
): Compensation {
  const found = findPayInText(description, sym);
  const ote = found.find((f) => f.label === "ote");
  const base = found.find((f) => f.label === "base");
  const result: Compensation = { ...EMPTY };

  if (structured.min && structured.max && plausibleRange(structured.min, structured.max)) {
    const sameAsOte = ote && Math.abs(ote.min - structured.min) < 1000 && Math.abs(ote.max - structured.max) < 1000;
    if (structured.isOte || sameAsOte) {
      result.ote_min = structured.min;
      result.ote_max = structured.max;
    } else {
      result.salary_min = structured.min;
      result.salary_max = structured.max;
    }
    result.currency = structured.currency ?? "USD";
  }
  if (result.salary_min == null && base) {
    result.salary_min = base.min;
    result.salary_max = base.max;
  }
  if (result.ote_min == null && ote) {
    result.ote_min = ote.min;
    result.ote_max = ote.max;
  }
  // Same numbers labeled both ways means the posting called it OTE somewhere: show it once, as OTE.
  if (result.salary_min != null && result.salary_min === result.ote_min && result.salary_max === result.ote_max) {
    result.salary_min = null;
    result.salary_max = null;
  }
  // OTE can never be below base. If it is, the labels got crossed ("$260K OTE ($130K base...)"): swap.
  if (result.salary_min != null && result.ote_max != null && result.ote_max < result.salary_min) {
    [result.salary_min, result.salary_max, result.ote_min, result.ote_max] = [result.ote_min, result.ote_max, result.salary_min, result.salary_max];
  }
  if ((result.salary_min ?? result.ote_min) != null && !result.currency) result.currency = sym === "£" ? "GBP" : "USD";
  return result;
}

/**
 * Which currency a job's pay is in. The ATS's own currency wins; then an explicit
 * currency in the posting; then the job's market (Canada-only = CAD, UK-only = GBP). Else USD.
 */
export function payCurrency(structured: string | null | undefined, description: string, markets: readonly string[]): "USD" | "CAD" | "GBP" {
  const s = structured?.trim().toUpperCase();
  if (s === "CAD" || s === "USD" || s === "GBP") return s;
  const only = markets.length === 1 ? markets[0] : null;
  if (only === "UK") return "GBP";
  if (/\b(CAD|CDN)\b|\bC\$|\bCA\$/.test(description)) return markets.includes("US") && /\bUSD\b/.test(description) ? "USD" : "CAD";
  return only === "CA" ? "CAD" : "USD";
}

/** Rough USD value for comparing against USD filters. Kept conservative on purpose. */
export const CAD_TO_USD = 0.72;
export const GBP_TO_USD = 1.25;

/** Multiply by this to get a rough USD value. */
export const toUsdRate = (currency: string | null | undefined) => (currency === "CAD" ? CAD_TO_USD : currency === "GBP" ? GBP_TO_USD : 1);
