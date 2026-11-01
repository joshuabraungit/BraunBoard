// "What you'd do": the job itself in plain English, for the top of the job page.
// The job summary from extract.ts is written for salespeople who already speak the jargon
// ("new logos and expansion in EMEA"). This one is for everyone: words a 12-year-old knows.

import { firstJsonObject } from "./buyer";
import { jargonIn as productJargon } from "./product";

// Sales and recruiting shorthand. Each has a plain version the model is told to use instead.
const SALES_JARGON =
  /\b(new logos?|net[- ]new|expansion|upsell\w*|cross[- ]sell\w*|land[- ]and[- ]expand|full[- ]cycle|book of business|EMEA|APAC|APJ|LATAM|DACH|ANZ|UK&I|ACV|ARR|TCV|ICP|MEDD\w*|BANT|C-suite|C-level|stakeholders?|multi-thread\w*|enterprise|mid-market|SMB|GTM|go-to-market|verticals?|SaaS|platform|solutions?|leverag\w*|pipeline generation|hunter|farmer|greenfield|whitespace|named accounts?|strategic accounts?)\b/gi;

/** Jargon in a "what you'd do" line, lowercased and de-duplicated. */
export function roleJargonIn(text: string): string[] {
  return [...new Set([...[...text.matchAll(SALES_JARGON)].map((m) => m[0].toLowerCase()), ...productJargon(text)])];
}

const SYSTEM = `You explain a sales job to someone deciding whether to apply, in plain English.
Write 1 or 2 short sentences, under 40 words total, that say what the person would actually do all day:
who they'd sell to (in plain words: "big companies", "small businesses", "hospitals", "restaurant owners"),
whether they'd find new customers or grow existing ones, and where in the world, if the posting says.
If the posting says how much prospecting they'd do, end with it plainly ("You'll book most of your own meetings." or "Leads come to you.").

Start with a verb, talking to the reader: "Find and win new customers at...", "Look after a group of existing customers...", "Lead a team of six salespeople who...".
Words a 12-year-old knows. Translate jargon, never repeat it:
new logos -> new customers; expansion/upsell -> selling more to existing customers; EMEA -> Europe, the Middle East and Africa;
APAC -> Asia and Australia; enterprise -> very big companies; mid-market -> medium-size companies; SMB -> small businesses;
full-cycle -> from first call to signed deal; book of business -> a set list of customers; C-suite -> top executives;
stakeholders -> the people involved in the decision; named/strategic accounts -> a short list of big customers.
No buzzwords (platform, solution, leverage, drive, own, seamless). No em dashes. Never add facts the posting doesn't state.

Return ONLY JSON: {"plain": "..."} or {"plain": null} if the posting doesn't describe the work.`;

async function ask(user: string, key: string): Promise<{ plain?: string | null }> {
  // Busy minutes hit the rate limit; wait and try again a few times before giving up.
  for (let attempt = 0; ; attempt++) {
    try {
      return await askOnce(user, key);
    } catch (e) {
      if (attempt >= 4 || !/\b(429|529|overloaded)\b/.test((e as Error).message)) throw e;
      await new Promise((r) => setTimeout(r, 5_000 * 2 ** attempt));
    }
  }
}

async function askOnce(user: string, key: string): Promise<{ plain?: string | null }> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.EXTRACTION_MODEL ?? "claude-haiku-5-5",
      // Room to think plus the answer, so replies are not cut off mid-JSON.
      max_tokens: 2000,
      system: SYSTEM,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { content: { type: string; text?: string }[] };
  return (firstJsonObject(data.content.filter((c) => c.type === "text").map((c) => c.text ?? "").join("")) ?? {}) as { plain?: string | null };
}

/** What's wrong with a draft. Empty means it's fine. */
export function rolePlainProblems(text: string): string[] {
  const out: string[] = [];
  const j = roleJargonIn(text);
  if (j.length) out.push(`It uses jargon: ${j.join(", ")}. Use the plain words instead.`);
  if (text.split(/\s+/).length > 48) out.push("Too long. Keep it under 40 words.");
  if (/[—–]/.test(text)) out.push("No em dashes.");
  return out;
}

/**
 * Write the plain line, with one rewrite if it slips into jargon. Null when there's nothing clean
 * to show (the page then falls back to the regular summary). Throws on API errors.
 */
export async function plainRole(title: string, description: string, key = process.env.ANTHROPIC_API_KEY): Promise<string | null> {
  if (!key || !description) return null;
  const base = `Title: ${title}\n\nPosting:\n${description.slice(0, 8000)}`;
  let draft = (await ask(base, key)).plain?.trim() || null;
  for (let i = 0; draft && i < 2; i++) {
    const problems = rolePlainProblems(draft);
    if (!problems.length) return draft;
    draft = (await ask(`${base}\n\nYour last draft: ${draft}\nFix these and rewrite:\n- ${problems.join("\n- ")}`, key)).plain?.trim() || null;
  }
  return draft && !rolePlainProblems(draft).length ? draft : null;
}
