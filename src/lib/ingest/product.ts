// "What they sell, in plain English": a short Common Craft style story about the product,
// written only from what the company's own posting says. Every story must be backed by a quote
// that really appears in the posting, or it's dropped.

import { firstJsonObject, quoteInPosting } from "./buyer";

export const PRODUCT_CATEGORIES = [
  "AI & data",
  "Security",
  "Finance & payments",
  "Developer & IT tools",
  "Sales & marketing",
  "HR & payroll",
  "Collaboration & productivity",
  "Customer support",
  "Legal & contracts",
  "Industry-specific software",
  "Hardware & IoT",
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export interface ProductInfo {
  story: string | null;
  short: string | null;
  quote: string | null;
  category: ProductCategory | null;
}

export const EMPTY_PRODUCT: ProductInfo = { story: null, short: null, quote: null, category: null };

const SYSTEM = `You explain what a company sells to salespeople deciding whether they'd be excited to sell it.
Write in the style of Common Craft "In Plain English" videos: problem first, simple words, everyday picture.

Return ONLY a JSON object:
{
  "story": 2 to 4 short sentences. First the problem a customer has, then what the product does about it, then what changes.
           Use a generic character ("a restaurant owner", "a finance team", "a hospital", "a clothing brand").
           Words a 12-year-old knows. No jargon, no buzzwords (platform, solution, leverage, seamless, AI-native, empower, transform).
           No numbers, customer names or claims that aren't in the posting. No em dashes. Under 60 words.
           Null if the posting doesn't say what the product does.
  "short": the same idea in 4 to 8 words, for a job card. Example: "Texts and emails picked for each shopper". Null if story is null.
  "quote": the sentence from the posting that the story is based on, copied character for character (max 300 chars). Null if story is null.
  "category": the ONE best fit for what the company sells, from this list exactly: ${PRODUCT_CATEGORIES.join(", ")}.
              "Industry-specific software" means software made for one industry (restaurants, construction, healthcare, legal).
              Null if the posting doesn't say what they sell.
}

Use ONLY the posting text. Never use anything you know about the company from outside it.
If the posting is only about the role and never describes the product, return all nulls.`;

const BANNED = /\b(platform|solutions?|leverag\w*|seamless\w*|empower\w*|transform\w*|synerg\w*|cutting-edge|best-in-class|AI-native)\b/i;

/** Keep only answers that are plain, short and backed by a real quote. */
export function cleanProduct(raw: Partial<ProductInfo> | null | undefined, posting: string): ProductInfo {
  if (!raw) return { ...EMPTY_PRODUCT };
  const story = raw.story?.trim().replace(/\s*[—–]\s*/g, ", ") ?? "";
  const short = raw.short?.trim().replace(/[.]$/, "") ?? "";
  const words = story.split(/\s+/).filter(Boolean).length;
  const category = PRODUCT_CATEGORIES.includes(raw.category as ProductCategory) ? (raw.category as ProductCategory) : null;
  const ok = story && words <= 70 && !BANNED.test(story) && quoteInPosting(raw.quote, posting);
  return {
    story: ok ? story : null,
    short: ok && short && short.split(/\s+/).length <= 10 && !BANNED.test(short) ? short : null,
    quote: ok ? raw.quote!.trim() : null,
    // A category is useful even when the story is thin, as long as the posting describes the product at all.
    category: ok ? category : null,
  };
}

/** Ask the model. Throws on API errors so callers can retry later. */
export async function extractProduct(company: string, posting: string, key = process.env.ANTHROPIC_API_KEY): Promise<ProductInfo & { raw: unknown }> {
  if (!key || !posting.trim()) return { ...EMPTY_PRODUCT, raw: null };
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.EXTRACTION_MODEL ?? "claude-haiku-5-5",
      max_tokens: 1500,
      system: SYSTEM,
      messages: [{ role: "user", content: `Company: ${company}\n\nPosting:\n${posting.slice(0, 12_000)}` }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { content: { type: string; text?: string }[] };
  const text = data.content.filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
  const raw = firstJsonObject(text) as Partial<ProductInfo>;
  return { ...cleanProduct(raw, posting), raw };
}
