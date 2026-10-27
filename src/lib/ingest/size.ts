// Company size for the jobs filter, in four broad buckets.
// First choice: the company's own postings ("we're a team of 300"), backed by an exact quote.
// Otherwise a best estimate for companies the AI knows well, marked as an estimate on the site.
// Unknown companies are left blank rather than guessed.

import { firstJsonObject, quoteInPosting } from "./buyer";
import { joinPostings } from "./product";

export const SIZE_BUCKETS = ["startup", "growth", "large", "enterprise"] as const;
export type SizeBucket = (typeof SIZE_BUCKETS)[number];

export const SIZE_LABELS: Record<SizeBucket, { label: string; range: string }> = {
  startup: { label: "Startup", range: "under 200 people" },
  growth: { label: "Growth", range: "200 to 1,000 people" },
  large: { label: "Large", range: "1,000 to 5,000 people" },
  enterprise: { label: "Enterprise", range: "5,000+ people" },
};

export const isSizeBucket = (v: unknown): v is SizeBucket => SIZE_BUCKETS.includes(v as SizeBucket);

/** Bucket for a headcount. */
export function bucketFor(n: number): SizeBucket {
  if (n < 200) return "startup";
  if (n < 1000) return "growth";
  if (n < 5000) return "large";
  return "enterprise";
}

export interface SizeInfo {
  bucket: SizeBucket | null;
  source: "posting" | "estimate" | null;
  quote: string | null;
}

const SYSTEM = `You work out roughly how many employees a company has, for a job board filter.

Return ONLY a JSON object:
{
  "headcount_quote": the sentence from the postings that states how many EMPLOYEES the company has, copied character for character (max 300 chars). Null if none says.
                     Only employee or team size counts ("over 1,200 employees", "a team of 300", "10,000+ people worldwide").
                     NOT customers, users, countries, offices, revenue or funding.
  "headcount": the number of employees that sentence states (use the lower bound for "1,000+"). Null if no quote.
  "estimate": if no posting says, your best estimate of the company's current employee count, as a number. Use what you know about this specific company: its funding stage, when it was founded, how fast it has grown. Null if you don't recognize this company at all.
  "confidence": "high" if you know this company well, "medium" if you know roughly what stage it's at (for example, a seed or Series A startup), "low" if you're mostly guessing from the name or the postings.
}

A company you only know from these postings is "low". Don't confuse it with a different company that has a similar name.`;

/** Keep only what checks out: a real quote with a number, or a confident estimate. */
export function cleanSize(raw: { headcount_quote?: unknown; headcount?: unknown; estimate?: unknown; confident?: unknown; confidence?: unknown } | null | undefined, postings: string): SizeInfo {
  const empty: SizeInfo = { bucket: null, source: null, quote: null };
  if (!raw) return empty;
  const quote = typeof raw.headcount_quote === "string" ? raw.headcount_quote.trim() : null;
  const n = Number(raw.headcount);
  if (quote && n > 0 && /\d/.test(quote) && quoteInPosting(quote, postings)) return { bucket: bucketFor(n), source: "posting", quote };
  const est = Number(raw.estimate);
  const sure = raw.confident === true || raw.confidence === "high" || raw.confidence === "medium";
  if (sure && est > 0) return { bucket: bucketFor(est), source: "estimate", quote: null };
  return empty;
}

export async function extractSize(company: string, postings: string[], key = process.env.ANTHROPIC_API_KEY): Promise<SizeInfo> {
  const text = joinPostings(postings);
  if (!key) return { bucket: null, source: null, quote: null };
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.EXTRACTION_MODEL ?? "claude-haiku-5-5",
      max_tokens: 1500,
      system: SYSTEM,
      messages: [{ role: "user", content: `Company: ${company}\n\nPostings:\n${text || "(none)"}` }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { content: { type: string; text?: string }[] };
  const raw = firstJsonObject(data.content.filter((c) => c.type === "text").map((c) => c.text ?? "").join("")) as Parameters<typeof cleanSize>[0];
  return cleanSize(raw, text);
}

/**
 * Sanity check on a size using how many openings the company has right now (all teams, all countries).
 * Companies we know are under 200 people never had more than 20 openings, so an estimated "startup"
 * with more than 40 is almost certainly bigger and moves up to "growth". Nothing else changes on its
 * own, because fast-growing AI startups can have hundreds of openings. Odd cases are flagged for a person.
 * Only estimates are checked. Sizes from a posting, a careers site or an admin are trusted.
 */
export function checkSize(bucket: SizeBucket | null, source: string | null, openings: number | null): { bucket: SizeBucket | null; changed: boolean; flag: string | null } {
  const same = { bucket, changed: false, flag: null };
  if (source !== "estimate" || !bucket || openings == null) return same;
  if (bucket === "startup" && openings > 40) return { bucket: "growth", changed: true, flag: `Was estimated as a startup, but has ${openings} openings` };
  if (bucket === "startup" && openings > 25) return { ...same, flag: `${openings} openings is a lot for under 200 people` };
  if (bucket === "growth" && openings <= 5) return { ...same, flag: `Only ${openings} openings. Could be under 200 people` };
  if (bucket === "growth" && openings > 150) return { ...same, flag: `${openings} openings. Could be over 1,000 people` };
  if (bucket === "large" && openings < 10) return { ...same, flag: `Only ${openings} openings for 1,000+ people` };
  if (bucket === "enterprise" && openings < 40) return { ...same, flag: `Only ${openings} openings for 5,000+ people` };
  return same;
}
