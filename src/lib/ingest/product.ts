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

/** How to pick a category. Shared by every prompt so the categories mean the same thing everywhere. */
export const CATEGORY_RULES = `Pick the ONE category for what the customer is buying, judged by the job it does for them, from this list exactly:
- "AI & data": the product IS AI models, AI infrastructure, a database, data pipelines or analytics. NOT apps that merely use AI.
- "Security": cybersecurity, identity, fraud prevention, privacy and compliance.
- "Finance & payments": payments, banking, cards, spend, accounting, lending, insurance, retirement plans.
- "Developer & IT tools": tools for engineers and IT: cloud, hosting, storage, monitoring, APIs, automation for IT and developers.
- "Sales & marketing": tools for sellers and marketers: sales data, ads, email and texts to customers, reviews, social media, websites and content.
- "HR & payroll": hiring, background checks, payroll, benefits, employee engagement.
- "Collaboration & productivity": general work tools any team uses: docs, projects, design, video, forms, workflows.
- "Customer support": help desks, contact centers, support chat and AI agents for support.
- "Legal & contracts": legal work and contracts, including AI for lawyers.
- "Industry-specific software": made for one industry (restaurants, healthcare, construction, manufacturing, government).
- "Hardware & IoT": the main product is physical: devices, sensors, vehicles, drones, robots.
An app that uses AI to do one job goes in that job's category (AI for lawyers is "Legal & contracts", AI for support is "Customer support").`;

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
  "category": the category name, following the category rules below. Null if the postings don't say what they sell.
}

Name the company in the story instead of saying "this product" or "this software".

${CATEGORY_RULES}

Use ONLY the postings. Never use anything you know about the company from outside them.
If the postings are only about the role and never describe the product, return all nulls.`;

const BANNED_RE = /\b(platform|solutions?|leverag\w*|seamless\w*|empower\w*|transform\w*|synerg\w*|cutting-edge|best-in-class|AI-native)\b/gi;

/** What's wrong with a draft, in words the model can act on. Empty means it's fine. */
export function problemsWith(raw: Partial<ProductInfo> | null | undefined, posting: string): string[] {
  if (!raw?.story) return [];
  const out: string[] = [];
  const banned = [...new Set([...(raw.story + " " + (raw.short ?? "")).matchAll(BANNED_RE)].map((m) => m[0].toLowerCase()))];
  if (banned.length) out.push(`It uses these banned words: ${banned.join(", ")}. Say what the thing actually does instead.`);
  if (raw.story.split(/\s+/).length > 70) out.push("The story is too long. Keep it under 60 words.");
  if (raw.short && raw.short.split(/\s+/).length > 10) out.push("The short line is too long. Use 4 to 8 words.");
  if (!quoteInPosting(raw.quote, posting)) out.push("The quote isn't copied exactly from the posting. Copy one real sentence character for character.");
  if (raw.category && !PRODUCT_CATEGORIES.includes(raw.category as ProductCategory)) out.push(`The category must be one of: ${PRODUCT_CATEGORIES.join(", ")}.`);
  return out;
}

/** Keep only answers that are plain, short and backed by a real quote. */
export function cleanProduct(raw: Partial<ProductInfo> | null | undefined, posting: string): ProductInfo {
  if (!raw?.story || problemsWith(raw, posting).length) return { ...EMPTY_PRODUCT };
  const story = raw.story.trim().replace(/\s*[—–]\s*/g, ", ");
  const short = raw.short?.trim().replace(/[.]$/, "") || null;
  return {
    story,
    short,
    quote: raw.quote!.trim(),
    category: PRODUCT_CATEGORIES.includes(raw.category as ProductCategory) ? (raw.category as ProductCategory) : null,
  };
}

const CHECK = `You fact-check a short plain-English story about what a company sells, against the company's own job postings.

Flag only FACTUAL claims about the product or the company that the postings don't support:
features, what the product does, who uses it, results, numbers, customers. Anything that comes from outside
knowledge about the company is unsupported, even if it's true.

Do NOT flag:
- The everyday problem the story opens with, when it's just the plain flip side of what the postings say the product does
  (postings say "work together in real time" -> "it's hard to keep everyone on the same page" is fine).
- A generic example customer ("a restaurant owner", "a trucking company") when the postings say the company serves that kind of customer.
- Simple restatements in plainer words.

Also pick the category.
${CATEGORY_RULES}

Return ONLY JSON: {"unsupported": ["each unsupported factual claim, quoted from the story"], "category": "..."}`;

async function ask(system: string, user: string, key: string): Promise<unknown> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.EXTRACTION_MODEL ?? "claude-haiku-5-5",
      // Room to think plus the JSON, so replies don't get cut off.
      max_tokens: 3000,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { content: { type: string; text?: string }[] };
  return firstJsonObject(data.content.filter((c) => c.type === "text").map((c) => c.text ?? "").join(""));
}

/** Several postings from one company, joined. More postings, fewer vague stories. */
export function joinPostings(postings: string[], max = 3): string {
  return [...new Set(postings.map((p) => p.trim()).filter(Boolean))]
    .sort((a, b) => b.length - a.length)
    .slice(0, max)
    .map((p, i) => `--- Posting ${i + 1} ---\n${p.slice(0, 5000)}`)
    .join("\n\n");
}

/**
 * Write, then fact-check. A draft with problems gets one rewrite with the problems named.
 * Throws on API errors so callers can retry later.
 */
export async function extractProduct(company: string, postings: string[], key = process.env.ANTHROPIC_API_KEY): Promise<ProductInfo & { raw: unknown }> {
  const text = joinPostings(postings);
  if (!key || !text) return { ...EMPTY_PRODUCT, raw: null };
  const base = `Company: ${company}\n\nPostings:\n${text}`;
  const log: Record<string, unknown> = {};

  let draft = (await ask(SYSTEM, base, key)) as Partial<ProductInfo>;
  log.first = draft;
  // Up to 3 rewrites in total. Wording fixes (banned words, length, quote) don't use up a fact-check;
  // a story only gets two fact-checks, and if the second still finds made-up claims it's dropped.
  let checks = 0;
  for (let rewrites = 0; draft?.story; rewrites++) {
    const problems = problemsWith(draft, text);
    if (!problems.length) {
      checks++;
      const check = (await ask(CHECK, `${base}\n\nStory: ${draft.story}\nShort line: ${draft.short ?? ""}`, key)) as { unsupported?: string[]; category?: string };
      log[`check${checks}`] = check;
      if (PRODUCT_CATEGORIES.includes(check.category as ProductCategory)) draft.category = check.category as ProductCategory;
      if (!check.unsupported?.length) break;
      if (checks >= 2) {
        draft = { story: null };
        break;
      }
      problems.push(`These claims aren't in the postings, so remove them: ${check.unsupported.join(" | ")}`);
    }
    if (rewrites >= 3) {
      // Still not clean: show nothing rather than something wrong.
      draft = { story: null };
      break;
    }
    draft = (await ask(SYSTEM, `${base}\n\nYour last draft:\n${JSON.stringify(draft)}\n\nFix these problems and rewrite, keeping every rule:\n- ${problems.join("\n- ")}`, key)) as Partial<ProductInfo>;
    log[`rewrite${rewrites + 1}`] = draft;
  }
  return { ...cleanProduct(draft, text), raw: log };
}

/** Re-pick the category for an existing story. One small call, no rewrite. */
export async function classifyCategory(company: string, story: string, quote: string | null, key = process.env.ANTHROPIC_API_KEY): Promise<ProductCategory | null> {
  if (!key) return null;
  const r = (await ask(
    `You sort companies by what they sell, for salespeople browsing jobs.\n${CATEGORY_RULES}\n\nReturn ONLY JSON: {"category": "..."}`,
    `Company: ${company}\nWhat they sell: ${story}${quote ? `\nFrom their posting: ${quote}` : ""}`,
    key,
  )) as { category?: string };
  return PRODUCT_CATEGORIES.includes(r?.category as ProductCategory) ? (r.category as ProductCategory) : null;
}
