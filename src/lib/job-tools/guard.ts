// The "I won't invent your past" rules, as plain code. Pure functions, no AI.
// Whatever the model writes, a line only gets through if every number, name and
// industry in it already shows up in what the rep gave us (or, for letters, the posting).

/** Collapse whitespace so text pulled from a PDF lines up with what the model quotes back. */
export const norm = (s: string) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();

const lower = (s: string) => norm(s).toLowerCase();

/** Numbers as written: "$1.2M", "140%", "12", "2,500". Compared without $ , and case. */
export function numbersIn(s: string): string[] {
  return (norm(s).match(/\$?\d[\d,]*(\.\d+)?\s?(%|[kKmMbB]\b)?/g) ?? []).map((n) => n.replace(/[$,\s]/g, "").toLowerCase());
}

/** Capitalized words and acronyms that aren't just starting a sentence or a bullet: company names, tools, methods. */
export function namesIn(s: string): string[] {
  const out: string[] = [];
  const sentences = norm(s).split(/(?<=[.!?:;•])\s+|\s[-•]\s/);
  for (const sentence of sentences) {
    // Bullets and stray punctuation aren't words, so the first real word is the one that starts the line.
    const words = sentence
      .split(/\s+/)
      .map((raw) => raw.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9+#&.-]+$/g, "").replace(/\.$/, ""))
      .filter(Boolean);
    words.forEach((w, i) => {
      if (i === 0) return;
      if (/^[A-Z]/.test(w) || /[a-z][A-Z]/.test(w)) out.push(w);
    });
  }
  return out.filter((w) => !COMMON_CAPS.has(w));
}

// Capitalized words that don't claim anything.
const COMMON_CAPS = new Set([
  "I", "I'm", "I've", "I'd", "I'll", "OK", "Q1", "Q2", "Q3", "Q4", "Monday", "Friday",
  "Dear", "Hi", "Hello", "Thanks", "Thank", "Best", "Sincerely", "Cheers", "LinkedIn",
]);

// Industries and segments: lowercase words that still claim experience you may not have.
const CLAIM_WORDS = [
  "healthcare", "health care", "fintech", "financial services", "banking", "insurance", "retail", "ecommerce", "e-commerce",
  "manufacturing", "logistics", "supply chain", "hospitality", "restaurant", "pharma", "pharmaceutical", "biotech", "life sciences",
  "cybersecurity", "security", "legal", "real estate", "construction", "energy", "utilities", "telecom", "automotive", "nonprofit",
  "higher ed", "higher education", "k-12", "education", "government", "public sector", "federal", "media", "gaming", "saas",
  "enterprise", "mid-market", "midmarket", "smb", "small business", "strategic accounts", "c-suite", "channel", "partner",
  "partnerships", "outbound", "inbound", "quota", "president's club", "presidents club",
];

const has = (hay: string, needle: string) => {
  const n = needle.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${n}([^a-z0-9]|$)`).test(hay);
};

/**
 * What a new line claims that the allowed text doesn't back up.
 * Empty list means the line is safe to show.
 */
export function unsupported(line: string, allowed: string): string[] {
  const hay = lower(allowed);
  const hayNums = new Set(numbersIn(allowed));
  const misses: string[] = [];
  for (const n of numbersIn(line)) if (!hayNums.has(n)) misses.push(n);
  for (const w of namesIn(line)) if (!has(hay, w)) misses.push(w);
  const low = lower(line);
  for (const c of CLAIM_WORDS) if (has(low, c) && !has(hay, c)) misses.push(c);
  return [...new Set(misses)];
}

/** Share of the posting's keywords that show up in the text, 0 to 100. */
export function keywordScore(keywords: string[], text: string): number {
  const ks = [...new Set(keywords.map((k) => k.trim().toLowerCase()).filter(Boolean))];
  if (!ks.length) return 0;
  const hay = lower(text);
  return Math.round((ks.filter((k) => has(hay, k)).length / ks.length) * 100);
}

export function missingKeywords(keywords: string[], text: string): string[] {
  const hay = lower(text);
  return [...new Set(keywords.map((k) => k.trim()).filter(Boolean))].filter((k) => !has(hay, k.toLowerCase()));
}

export interface Edit {
  before: string;
  after: string;
  why: string;
}

/**
 * Keep only edits that rewrite a line that's really on the résumé and don't add anything
 * the résumé doesn't already say somewhere. Returns what was kept and what got dropped (and why).
 */
export function vetEdits(resume: string, edits: Edit[]): { kept: Edit[]; dropped: { edit: Edit; reason: string }[] } {
  const text = norm(resume);
  const kept: Edit[] = [];
  const dropped: { edit: Edit; reason: string }[] = [];
  const seen = new Set<string>();
  for (const e of edits) {
    const before = norm(e.before ?? "");
    const after = norm(e.after ?? "");
    if (!before || !after || before === after) continue;
    if (seen.has(before)) continue;
    if (!text.includes(before)) {
      dropped.push({ edit: e, reason: "That line isn't on your résumé word for word." });
      continue;
    }
    // New numbers must come from the line itself: no moving a metric to a different job.
    const newNums = numbersIn(after).filter((n) => !numbersIn(before).includes(n));
    if (newNums.length) {
      dropped.push({ edit: e, reason: `Added a number you didn't write (${newNums.join(", ")}).` });
      continue;
    }
    const misses = unsupported(after, resume);
    if (misses.length) {
      dropped.push({ edit: e, reason: `Claimed something your résumé doesn't say (${misses.join(", ")}).` });
      continue;
    }
    seen.add(before);
    kept.push({ before, after, why: norm(e.why ?? "") });
  }
  return { kept, dropped };
}

/** The résumé with the chosen edits swapped in. */
export function applyEdits(resume: string, edits: Edit[]): string {
  let text = norm(resume);
  for (const e of edits) text = text.split(norm(e.before)).join(norm(e.after));
  return text;
}

/** Split into sentences and drop any that claim something unbacked. Used for letters. */
export function keepBacked(text: string, allowed: string): { text: string; removed: string[] } {
  const parts = norm(text).split(/(?<=[.!?])\s+/);
  const removed: string[] = [];
  const kept = parts.filter((p) => {
    const bad = unsupported(p, allowed).length > 0;
    if (bad) removed.push(p);
    return !bad;
  });
  return { text: kept.join(" "), removed };
}

/** No em or en dashes in anything we hand someone to send. */
export const noDashes = (s: string) => s.replace(/\s*[—–]\s*/g, ", ").replace(/,\s*,/g, ",");
