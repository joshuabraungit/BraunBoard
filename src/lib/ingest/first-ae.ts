// "First AE job": an Account Executive role the posting says is open to someone with little closing
// experience (0 to 2 years), or that counts SDR/BDR time. Built for SDRs looking for their first closing role.
// A quick text check finds AE postings that might qualify; the AI then reads the experience section and
// has to quote the words it used. "Associate" in the title isn't enough on its own (some ask for 3-5 years),
// and "Emerging Enterprise" is about the customer's size, not the seller's experience.

import { firstJsonObject } from "./buyer";

/** Cheap first pass: junior-sounding title, a short experience ask, or SDR/BDR experience mentioned. */
const TITLE_HINT = /\b(associate|junior|jr\.?|entry[- ]level)\b/i;
const TEXT_HINT =
  /\b(0|1)\s*(-|–|to)\s*(2|3)\+?\s*(years|yrs)|\b(1\+|one\+|at least (1|one)|minimum (of )?(1|one))\s*(year|yr)s?\b|\b(sdr|bdr|sales development|business development rep)/i;
const TOO_SENIOR_TITLE = /\b(senior|sr\.?|principal|director|manager|lead|head|vp|strategic|major|global)\b/i;

export function mightBeFirstAe(title: string, description: string, roleFamily?: string | null) {
  if (roleFamily && roleFamily !== "Account Executive") return false;
  if (TOO_SENIOR_TITLE.test(title)) return false;
  return TITLE_HINT.test(title) || TEXT_HINT.test(description);
}

const SYSTEM = `You read a B2B sales job posting and decide one thing: could someone land this as their FIRST closing (Account Executive) job?

Answer true only when the posting itself says so, in one of these ways:
- It asks for 0 to 2 years of closing / full-cycle / quota-carrying experience (e.g. "1+ years of closing experience", "1-2 years of quota-carrying sales").
- It counts SDR/BDR/sales development experience toward the requirement, or says it's a step up from SDR (e.g. "1-3 years as an SDR, or 1-2 years closing").
- The title says Associate/Junior/Entry-level AE and nothing in the posting asks for 3+ years of closing experience.

Answer false when:
- It asks for "2+ years" (or more) of closing, full-cycle or quota-carrying experience. "2+" means at least two years of closing, so it's not a first AE job.
- It asks for 3 or more years of closing, full-cycle or quota-carrying experience anywhere (even if another line says 1+ years).
- The only short experience ask is about something other than selling (an industry, a tool, a degree), and the posting doesn't say junior sellers are welcome.
- It isn't really a closing sales role (PR or agency "account executives", clinical or medical device roles, retail, customer support).
- It says nothing about experience level. Don't guess.

Return ONLY JSON: {"first_ae": true or false, "evidence": "the exact words from the posting that show it (copied character for character), or null"}`;

async function ask(text: string, key: string): Promise<{ first_ae?: boolean; evidence?: string | null }> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.EXTRACTION_MODEL ?? "claude-haiku-5-5",
        max_tokens: 800,
        system: SYSTEM,
        messages: [{ role: "user", content: text }],
      }),
    });
    if ([429, 529].includes(res.status) && attempt < 4) {
      await new Promise((r) => setTimeout(r, 5_000 * 2 ** attempt));
      continue;
    }
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = (await res.json()) as { content: { type: string; text?: string }[] };
    return (firstJsonObject(data.content.filter((c) => c.type === "text").map((c) => c.text ?? "").join("")) ?? {}) as never;
  }
}

const squash = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/** "2+ years", "3+ yrs", "2 or more years"... of experience (not the top of a range like "1-2+ years"), unless the same words count SDR/BDR time. */
const AT_LEAST_TWO = /(?<!\d\s*(-|–|to)\s*)\b([2-9]|1\d)\s*(\+|or more)\s*(years|yrs)|\b(at least|minimum( of)?)\s*([2-9]|two|three|four|five)\s*(years|yrs)/i;
const SDR = /\b(sdr|bdr|sales development|business development rep)/i;
export const quoteTooSenior = (quote: string) => AT_LEAST_TWO.test(quote) && !SDR.test(quote);

/**
 * { first_ae, quote }. Skips the AI when the posting can't qualify (not an AE role, senior title, no hint).
 * A "yes" only counts when the quoted words are really in the posting. Throws on API errors.
 */
export async function firstAe(
  title: string,
  description: string,
  roleFamily?: string | null,
  key = process.env.ANTHROPIC_API_KEY,
): Promise<{ first_ae: boolean; quote: string | null }> {
  if (!key || !description || !mightBeFirstAe(title, description, roleFamily)) return { first_ae: false, quote: null };
  const text = `Title: ${title}\n\nPosting:\n${description.slice(0, 14_000)}`;
  const r = await ask(text, key);
  const quote = r.evidence?.trim() || null;
  if (r.first_ae !== true || !quote || !squash(text).includes(squash(quote)) || quoteTooSenior(quote)) return { first_ae: false, quote: null };
  return { first_ae: true, quote: quote.slice(0, 400) };
}
