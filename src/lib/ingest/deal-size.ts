// Deal size: what the deals in THIS job are worth, when the posting says so ("deal sizes range from
// $50K to $500K"). Rare, which is why it's worth putting on the card. A quick text check finds the
// handful of postings that mention a dollar deal size; the AI then reads them and has to quote the
// words it used. "You've closed $100K+ deals before" is about the candidate, not this job, so it's out.

import { firstJsonObject } from "./buyer";

/** Cheap first pass: does the posting put a money amount near deal-size words at all? */
export const DEAL_HINT = /(deal size|deal value|\bACV\b|contract value|deals? (of|averaging|worth|ranging|between|from)|average deal)[^.]{0,60}[$£€]\s?\d/i;

const SYSTEM = `You read a sales job posting and pull out the deal size: what a typical deal in THIS job is worth.

Only answer when the posting says what this role's deals are worth, like "deal sizes range from $50K to $500K",
"you'll manage deals averaging $40K ACV", "selling contracts of $100k+ ARR".
Answer null when the money amount is about the candidate's past ("experience closing deals of $100K+",
"a track record of $1M+ deals"), about quota, revenue targets, funding or company size, or anything else.

Write the amount short, in the posting's currency: "$40K", "$50K–$500K", "$100K+", "£150K+", "$1M+".
Return ONLY JSON: {"deal_size": "..." or null, "evidence": "the exact words from the posting that say it (copied character for character), or null"}`;

async function ask(text: string, key: string): Promise<{ deal_size?: string | null; evidence?: string | null }> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.EXTRACTION_MODEL ?? "claude-haiku-5-5",
        max_tokens: 1500,
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
const SHAPE = /^~?[$£€]\d[\d.,]*[KM]?(\s?[–-]\s?[$£€]?\d[\d.,]*[KM]?)?\+?$/;

/** "$50K–$500K", or null. Skips the AI when the posting never mentions a deal-size amount. Throws on API errors. */
export async function dealSize(title: string, description: string, key = process.env.ANTHROPIC_API_KEY): Promise<string | null> {
  if (!key || !description || !DEAL_HINT.test(description)) return null;
  const text = `Title: ${title}\n\nPosting:\n${description.slice(0, 12_000)}`;
  const r = await ask(text, key);
  const size = r.deal_size?.trim().replace(/k\b/g, "K").replace(/\s*-\s*/, "–") || null;
  const evidence = r.evidence?.trim() || null;
  // Has to look like an amount and be backed by words that are really in the posting.
  if (!size || !SHAPE.test(size) || !evidence || !squash(text).includes(squash(evidence))) return null;
  return size;
}
