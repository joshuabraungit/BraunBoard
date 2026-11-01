// Which country a job is really in, when the location field doesn't say ("Remote", "Distributed",
// "Remote - Georgia"). The AI reads the title, location and posting and has to point to the words
// that prove it; an answer it can't back up with text from the posting counts as "unknown".

import { firstJsonObject } from "./buyer";
import type { Market } from "./location";

export type CountryAnswer = Market | "other" | "unknown";

const SYSTEM = `You decide which country a sales job is based in, for a job board that lists jobs in the
United States (US), Canada (CA), the United Kingdom (UK) and Germany (DE).

Read the title, location field and posting. Answer with:
- "US", "CA", "UK" or "DE" when the text shows the job is based there (a US state or city like "Remote - TN"
  or "California - Remote", a US territory like "Southeast" or "NAMER" with US pay ranges, "must live in the US",
  a Canadian province, a UK city, a German city).
- "other" when it's based somewhere else (Poland, MENA, India, Australia...).
- "unknown" when the text doesn't say. Don't guess from the company's headquarters or the currency alone.
Note: "Georgia" alone is ambiguous; treat it as the US state only if other US clues back it up.

Return ONLY JSON: {"country": "...", "evidence": "the exact words from the title, location or posting that show it (copied character for character), or null"}`;

async function ask(user: string, key: string): Promise<{ country?: string; evidence?: string | null }> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.EXTRACTION_MODEL ?? "claude-haiku-5-5",
        max_tokens: 1500,
        system: SYSTEM,
        messages: [{ role: "user", content: user }],
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

/** The country for a job whose location doesn't name one. Throws on API errors so callers can retry. */
export async function resolveCountry(
  title: string,
  location: string,
  description: string,
  key = process.env.ANTHROPIC_API_KEY,
): Promise<{ country: CountryAnswer; evidence: string | null }> {
  if (!key) return { country: "unknown", evidence: null };
  const text = `Title: ${title}\nLocation: ${location}\n\nPosting:\n${description.slice(0, 10_000)}`;
  const r = await ask(text, key);
  const country = (["US", "CA", "UK", "DE", "other", "unknown"].includes(r.country ?? "") ? r.country : "unknown") as CountryAnswer;
  const evidence = r.evidence?.trim() || null;
  // An answer has to be backed by words that are really there.
  if (country !== "unknown" && (!evidence || !squash(text).includes(squash(evidence)))) return { country: "unknown", evidence: null };
  return { country, evidence };
}

/** Full country name for the location parser's country hint. */
export const COUNTRY_NAME: Record<Market, string> = { US: "United States", CA: "Canada", UK: "United Kingdom", DE: "Germany" };
