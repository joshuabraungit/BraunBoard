// "Who you're selling to": the buyer and industry, only as the posting states them.
// Every answer must come with a quote that really appears in the posting, or it's dropped.

import { plainBuyer } from "./buyer-plain";

export interface BuyerInfo {
  buyer: string | null;
  buyer_quote: string | null;
  industry: string | null;
  industry_quote: string | null;
}

export const EMPTY_BUYER: BuyerInfo = { buyer: null, buyer_quote: null, industry: null, industry_quote: null };

const SYSTEM = `You read B2B sales job postings for a job board used by salespeople.
Answer one question: who does this rep sell to?

Return ONLY a JSON object:
{
  "buyer": the specific job titles, departments or kinds of customer the rep sells to, in plain words.
           Good: "CFOs and finance teams", "Heads of security and security teams", "Customer support leaders", "Developers and engineering leaders",
           "Procurement, finance, IT and legal", "Restaurant owners", "Small business owners", "Lenders", "Ad agencies".
           Keep it under 10 words: who they are, not the company size. Null if the posting doesn't name one.
  "buyer_quote": the exact words from the posting that support "buyer", copied character for character (max 200 chars). Null if buyer is null.
  "industry": the industry or market the customers are in, under 6 words, if the posting states one (e.g. "Healthcare", "Federal government",
              "State and local government and education", "Financial services", "Retail", "Restaurants"). Null if not stated.
  "industry_quote": exact supporting words from the posting, copied character for character (max 200 chars). Null if industry is null.
}

What counts as a buyer:
- Who the rep sells to or engages ("sell to CFOs", "engage CISOs", "selling to procurement, finance, IT").
- Who the product is for, when the posting itself says it ("the help desk for modern support teams",
  "the platform Security, IT and GRC teams use", "we handle payroll so owners can focus on their business").
  That's the posting's own words, so it counts.

What does NOT count. Return null instead:
- Generic seniority or role words with no department: "C-suite executives", "C-level", "senior executives", "executives",
  "decision makers", "stakeholders", "business and technical leaders", "technical and non-technical buyers", "leaders".
- Vague customer words: "customers", "clients", "brands", "the world's leading brands", "companies", "organizations", "businesses".
- The company's own internal teams the rep works with (Sales Engineers, Marketing, Customer Success, Product).
- Company size alone (enterprise, mid-market, SMB, Fortune 500). That's not a buyer or an industry.
- Anything you know about the company from outside the posting. Use ONLY the posting text.`;

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

/** True when the quote really appears in the posting (ignoring case, curly quotes and spacing). */
export function quoteInPosting(quote: string | null | undefined, posting: string): boolean {
  if (!quote) return false;
  const q = norm(quote).replace(/^["'.\s…]+|["'.\s…]+$/g, "");
  return q.length >= 8 && norm(posting).includes(q);
}

const GENERIC =
  /^(the )?(c-?suite|c-?level|senior|executive|executives|decision[- ]makers?|stakeholders?|leaders|leadership|customers?|clients?|brands?|companies|organizations|businesses|enterprises?|buyers?)( (executives|leaders|leadership|stakeholders|buyers|decision[- ]makers))?$/i;

/** Keep only answers that are specific and backed by a real quote. */
export function cleanBuyer(raw: Partial<BuyerInfo> | null | undefined, posting: string): BuyerInfo {
  const out = { ...EMPTY_BUYER };
  if (!raw) return out;
  const b = raw.buyer?.trim();
  if (b && !GENERIC.test(b) && b.length <= 140 && quoteInPosting(raw.buyer_quote, posting)) {
    out.buyer = b;
    out.buyer_quote = raw.buyer_quote!.trim();
  }
  const ind = raw.industry?.trim();
  if (ind && ind.length <= 80 && quoteInPosting(raw.industry_quote, posting)) {
    out.industry = ind;
    out.industry_quote = raw.industry_quote!.trim();
  }
  return out;
}

/** The first complete JSON object in a reply, ignoring any text after it. */
export function firstJsonObject(text: string): unknown {
  const start = text.indexOf("{");
  if (start < 0) throw new Error(`No JSON in reply: ${text.slice(0, 120)}`);
  for (let end = text.indexOf("}", start); end > 0; end = text.indexOf("}", end + 1)) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      // keep extending to the next closing brace
    }
  }
  throw new Error(`Unreadable JSON in reply: ${text.slice(0, 120)}`);
}

/** Ask the model. Returns the cleaned result; throws on API errors so callers can retry later. */
export async function extractBuyer(title: string, description: string, key = process.env.ANTHROPIC_API_KEY): Promise<BuyerInfo> {
  if (!key || !description.trim()) return { ...EMPTY_BUYER };
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.EXTRACTION_MODEL ?? "claude-haiku-5-5",
      // The model may think before answering; leave room for that plus the JSON.
      max_tokens: 1500,
      system: SYSTEM,
      messages: [{ role: "user", content: `Title: ${title}\n\nPosting:\n${description.slice(0, 12_000)}` }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { content: { type: string; text?: string }[] };
  const text = data.content.filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
  const out = cleanBuyer(firstJsonObject(text) as Partial<BuyerInfo>, description);
  // Shorthand like "CISOs" or "AI/ML teams" gets rewritten in plain words; the quote keeps the posting's own.
  if (out.buyer) out.buyer = await plainBuyer(out.buyer, key).catch(() => out.buyer);
  return out;
}
