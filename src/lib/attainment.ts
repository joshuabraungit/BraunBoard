// Quota attainment a posting states about its own team. Pure text parsing, no AI, no guessing.
//
// Two kinds, and they mean different things:
//  - "hit":     "49% of reps are achieving 100%+ of quota". How many reps make their number.
//  - "average": "Our reps are averaging 145% quota attainment". An average can hide that half the team missed.
// Talk about the candidate ("track record of quota attainment") or an expectation
// ("100% minimum attainment expected") is not a disclosure and never matches.

export interface Attainment {
  kind: "hit" | "average";
  /** The percentage as stated. For "hit": share of reps. For "average": average attainment. */
  pct: number;
  /** The sentence it came from, in the posting's own words. */
  quote: string;
}

const PEOPLE = String.raw`(?:reps|representatives|sellers|aes|account executives|sdrs|bdrs|salespeople|team members|team|sales team|quota[- ]carriers)`;
const NUM = String.raw`(\d{1,3}(?:\.\d+)?)\s?%`;

// "49% of reps are achieving 100%+ of quota", "70% of our AEs hit quota", "80% of the team exceeded quota last year"
const HIT = new RegExp(
  String.raw`\b${NUM}\s+of\s+(?:our\s+|the\s+|all\s+)?(?:[\w-]+\s+){0,2}${PEOPLE}\s+(?:are\s+|were\s+|have\s+)?(?:hit|hitting|achieved|achieving|exceeded|exceeding|made|making|attained|attaining|reached|reaching|at|above|over)\b[^.\n]{0,40}?\bquota`,
  "i",
);
// "reps are averaging 145% quota attainment", "average attainment of 112%", "averaging 117% attainment"
const AVERAGE = [
  new RegExp(String.raw`\b${PEOPLE}\s+(?:are\s+|were\s+)?averag(?:e|ed|ing)\s+${NUM}\s*(?:of\s+)?(?:quota|attainment|quota attainment|of (?:their )?(?:quota|target))`, "i"),
  new RegExp(String.raw`\baverage\s+(?:quota\s+)?attainment\s+(?:of|is|was|at|sits at|has been)\s+${NUM}`, "i"),
  new RegExp(String.raw`\baveraging\s+${NUM}\s+(?:quota\s+)?attainment`, "i"),
];

function sentenceAround(text: string, index: number, length: number): string {
  const start = Math.max(text.lastIndexOf(". ", index) + 2, text.lastIndexOf("\n", index) + 1, 0);
  const endDot = text.indexOf(".", index + length);
  const endLine = text.indexOf("\n", index + length);
  const ends = [endDot >= 0 ? endDot + 1 : text.length, endLine >= 0 ? endLine : text.length];
  const s = text.slice(start, Math.min(...ends)).replace(/^[\s\-•*]+/, "").trim();
  return s.length > 220 ? `${s.slice(0, 217).trimEnd()}...` : s;
}

export function parseAttainment(text: string | null | undefined): Attainment | null {
  if (!text) return null;
  const hit = text.match(HIT);
  if (hit && hit.index != null) {
    const pct = parseFloat(hit[1]!);
    if (pct > 0 && pct <= 100) return { kind: "hit", pct, quote: sentenceAround(text, hit.index, hit[0].length) };
  }
  for (const re of AVERAGE) {
    const m = text.match(re);
    if (m && m.index != null) {
      const pct = parseFloat(m[1]!);
      if (pct >= 30 && pct <= 300) return { kind: "average", pct, quote: sentenceAround(text, m.index, m[0].length) };
    }
  }
  return null;
}

/** Roles where "how many reps hit quota" is the question that matters. */
export const ATTAINMENT_ROLES = new Set(["SDR/BDR", "Account Executive", "Account Manager", "Customer Expansion"]);

export const attainmentLabel = (a: Attainment) => (a.kind === "hit" ? `${a.pct}% hit quota` : `${a.pct}% average attainment`);
