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
Write it the way a person would explain it to a friend over coffee: plain words, a picture they can see, the problem before the product.

Return ONLY a JSON object:
{
  "story": exactly 3 sentences, in this order:
           1. "When [a customer] has to [the job the product helps with], they usually [how it gets done without the product]."
           2. "The problem is, [what goes wrong with doing it that way]."
           3. "[Company] [what it does, in plain words], so [what changes for the customer]."
           Example: "When a town has to decide something big, like what to build on an empty lot, it usually holds a public meeting.
           The problem is, only a handful of people show up, and they don't speak for everyone else. Embold runs surveys that reach
           a real cross-section of the town, so the city knows what most people want before it spends the money."
           Example: "When a plumber or landscaper finishes a job, they usually still have to write up the invoice and chase the payment
           themselves. The problem is, that paperwork eats their nights and weekends. Jobber lets them quote, schedule, invoice, and
           get paid from one app, so they spend more time on the work that pays."
           The "usually" part must be the plain flip side of what the postings say (postings say "replaces spreadsheets" or
           "instead of chasing payments by hand", or the product obviously replaces doing the job by hand). Never name a
           competitor, tool or number the postings don't name. If the postings don't hint at how it's done today, describe the job
           itself in sentence 1 instead of guessing ("When a hospital orders supplies, there are hundreds of items to track.").
           Use a generic character ("a restaurant owner", "a finance team", "a hospital", "a clothing brand").
           Words a 12-year-old knows. No jargon, no buzzwords (platform, solution, leverage, seamless, AI-native, empower, transform,
           workflow, streamline, optimize, insights, end-to-end, at scale, ecosystem, unified, robust, scalable, actionable, digital experience).
           No insider tech words either: say what they mean (not "AI models" but "the AI"; not "agents" but "AI that answers questions";
           not "compliance" but "passing security checks"; not "monitoring" but "watching for problems"; not "infrastructure", "API",
           "deploy", "inference", "analytics", "observability", "SaaS", "stack" or "in the cloud" at all).
           Make the stakes concrete in sentence 2 and 3: what it costs, who notices, what breaks ("costs money", "customers notice",
           "hackers can break in", "eats their nights and weekends").
           Prefer concrete nouns people can picture (cards, cameras, a spreadsheet, a checklist, a phone call) over abstract ones (processes, operations, data).
           No numbers, customer names or claims that aren't in the posting. No em dashes. Under 65 words.
           Null if the posting doesn't say what the product does.
  "short": the same idea in 4 to 10 words, for a job card. Say what it does FOR the customer, in plain verbs,
           the way you'd explain it to a friend at a barbecue who doesn't work in tech. Usually "Helps [who] [get something they care about]",
           or a plain verb that does the same job ("Finds...", "Keeps...", "Shows...", "Turns...").
           If a friend would ask "but what IS it?" or "what does that mean?", it's wrong.
           Good: "Helps restaurants take orders and payments in one place", "Finds and fixes security holes in the code companies write",
                 "Warns companies the moment their website or app breaks", "Shows companies where customers get stuck on their site",
                 "Helps apps understand what people say out loud", "GPS trackers and dash cams for truck fleets".
           Bad: "Tools to tune and run AI models for companies", "AI security agents that find and fix code risks",
                "Monitoring and security software for cloud apps", "Software that automates security compliance",
                "Shared workflows that help teams get work done", "Business payments that partners can build in".
           Null if story is null.
  "quote": the sentence from the posting that the story is based on, copied character for character (max 300 chars). Null if story is null.
  "category": the category name, following the category rules below. Null if the postings don't say what they sell.
}

Name the company in the story instead of saying "this product" or "this software".

${CATEGORY_RULES}

Use ONLY the postings. Never use anything you know about the company from outside them.
If the postings are only about the role and never describe the product, return all nulls.`;

const BANNED_RE =
  /\b(platform|solutions?|leverag\w*|seamless\w*|empower\w*|transform\w*|synerg\w*|cutting-edge|best-in-class|AI-native|workflows?|streamlin\w*|optimi[sz]\w*|insights?|end-to-end|at scale|ecosystems?|unified|holistic|robust|scalable|actionable)\b/gi;

// Insider tech words a salesperson outside that niche wouldn't know. Like BANNED_RE, but they get a translation hint.
export const JARGON_RE =
  /\b(models?|AI( \w+)? agents?|agentic|infrastructure|compliance|monitor(ing)?|analytics|observability|API|APIs|SaaS|deploy\w*|inference|pipelines?|stack|fine-tun\w*|tun(e|ing) (a|the|their|its|your)? ?models?|in the cloud|cloud-native|LLMs?|GPUs?|orchestrat\w*|endpoints?|provision\w*|KPIs?|ROI)\b/gi;

// Headlines that name a category of thing instead of what it does for anyone.
const VAGUE_SHORT = /^(software|tools?|a tool|an? (app|platform|system|suite|set))\b/i;

/** An existing headline or story that breaks the plain-English rules and should be rewritten. */
export function needsPlainRewrite(short: string | null, story: string | null): boolean {
  if (!story) return false;
  return (!!short && VAGUE_SHORT.test(short.trim())) || jargonIn(`${short ?? ""} ${story}`).length > 0;
}

/** Insider words in a headline or story, lowercased and de-duplicated. */
export function jargonIn(text: string): string[] {
  return [...new Set([...text.matchAll(JARGON_RE)].map((m) => m[0].toLowerCase()))];
}

/** What's wrong with a draft, in words the model can act on. Empty means it's fine. */
export function problemsWith(raw: Partial<ProductInfo> | null | undefined, posting: string, opts: { quoteOptional?: boolean } = {}): string[] {
  if (!raw?.story) return [];
  const out: string[] = [];
  const banned = [...new Set([...(raw.story + " " + (raw.short ?? "")).matchAll(BANNED_RE)].map((m) => m[0].toLowerCase()))];
  if (banned.length) out.push(`It uses these banned words: ${banned.join(", ")}. Say what the thing actually does instead.`);
  const jargon = jargonIn(raw.story + " " + (raw.short ?? ""));
  if (jargon.length) out.push(`It uses insider tech words: ${jargon.join(", ")}. Say what they mean in words a friend outside tech knows.`);
  if (raw.story.split(/\s+/).length > 75) out.push("The story is too long. Keep it under 65 words.");
  if (!/\bThe problem is\b/.test(raw.story) || !/^When\b/.test(raw.story.trim()))
    out.push('Follow the 3-sentence template: start with "When [a customer] has to...", then "The problem is, ...", then what the company does and what changes.');
  if (raw.short && raw.short.split(/\s+/).length > 12) out.push("The short line is too long. Use 4 to 10 words.");
  if (raw.short && VAGUE_SHORT.test(raw.short.trim())) out.push('The short line starts with what kind of thing it is ("Software...", "Tools..."). Start with what it does for the customer, like "Helps restaurants take orders and payments in one place".');
  if (!(opts.quoteOptional && !raw.quote) && !quoteInPosting(raw.quote, posting)) out.push("The quote isn't copied exactly from the posting. Copy one real sentence character for character.");
  if (raw.category && !PRODUCT_CATEGORIES.includes(raw.category as ProductCategory)) out.push(`The category must be one of: ${PRODUCT_CATEGORIES.join(", ")}.`);
  return out;
}

/** Keep only answers that are plain, short and backed by a real quote. */
export function cleanProduct(raw: Partial<ProductInfo> | null | undefined, posting: string, opts: { quoteOptional?: boolean } = {}): ProductInfo {
  if (!raw?.story || problemsWith(raw, posting, opts).length) return { ...EMPTY_PRODUCT };
  const story = raw.story.trim().replace(/\s*[—–]\s*/g, ", ");
  const short = raw.short?.trim().replace(/[.]$/, "") || null;
  return {
    story,
    short,
    quote: raw.quote?.trim() || null,
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
- How customers "usually" get the job done today, when it's the plain flip side of what the postings say
  (postings say "get paid faster" -> "they usually chase payments by hand" is fine). DO flag it if it names
  a specific competitor, product, tool or number the postings don't mention.
- A generic example customer ("a restaurant owner", "a trucking company") when the postings say the company serves that kind of customer.
- Simple restatements in plainer words.

Also pick the category.
${CATEGORY_RULES}

Return ONLY JSON: {"unsupported": ["each unsupported factual claim, quoted from the story"], "category": "..."}`;

async function ask(system: string, user: string, key: string): Promise<unknown> {
  // Busy minutes hit the rate limit; wait and try again a few times before giving up.
  for (let attempt = 0; ; attempt++) {
    try {
      return await askOnce(system, user, key);
    } catch (e) {
      if (attempt >= 4 || !/\b(429|529|overloaded)\b/.test((e as Error).message)) throw e;
      await new Promise((r) => setTimeout(r, 5_000 * 2 ** attempt));
    }
  }
}

async function askOnce(system: string, user: string, key: string): Promise<unknown> {
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

// ---------------------------------------------------------------------------
// Big companies that sell many things. Built from postings, the story describes whatever product
// the longest posting happened to be about (Stripe came out as "sends money to contractors").
// For these, describe the main thing the company is known for and most of its reps sell.
// ---------------------------------------------------------------------------

/** Big, well-known, hiring a lot: describe the company's main product, not one posting's. */
export function isCoreCompany(size: string | null | undefined, openSalesRoles: number): boolean {
  return (size === "large" || size === "enterprise") && openSalesRoles >= 10;
}

const CORE_SYSTEM = SYSTEM.replace(
  "Use ONLY the postings. Never use anything you know about the company from outside them.\nIf the postings are only about the role and never describe the product, return all nulls.",
  `This is a big company that sells several products. Describe its MAIN product line: what it's best known for
and what most of its salespeople sell. Not a side product that one posting happens to be about.
You may use widely known facts about the company. Keep to what's common knowledge; no numbers, customer names
or recent news. If you aren't sure what its main product is, return all nulls.
"quote" may be null here; if a posting sentence supports the story, copy it exactly.`,
);

// If the base prompt's wording changes, this replace would silently do nothing. Fail loudly instead.
if (CORE_SYSTEM === SYSTEM) throw new Error("product.ts: CORE_SYSTEM didn't replace the postings-only rule");

const CORE_CHECK = `You check a short plain-English story about what a well-known company sells.
Answer two things:
1. Is this the company's main product line, the thing it's best known for and most of its salespeople sell?
   (A side product or one team's product is a "no".)
2. Is every claim widely known and accurate? Flag anything doubtful, made up, or too specific to be common knowledge.
Also pick the category.
${CATEGORY_RULES}

Return ONLY JSON: {"main_product": true|false, "problems": ["each problem"], "category": "..."}`;

/** Write the main-product story for a big company, with one rewrite if the check finds problems. */
export async function extractCoreProduct(company: string, postings: string[], key = process.env.ANTHROPIC_API_KEY): Promise<ProductInfo & { raw: unknown }> {
  const text = joinPostings(postings);
  if (!key) return { ...EMPTY_PRODUCT, raw: null };
  const base = `Company: ${company}\n\nSome of its current sales postings, for context:\n${text || "(none)"}`;
  const log: Record<string, unknown> = {};
  let draft = (await ask(CORE_SYSTEM, base, key)) as Partial<ProductInfo>;
  log.first = draft;
  for (let round = 0; draft?.story && round < 3; round++) {
    const problems = problemsWith(draft, text, { quoteOptional: true });
    if (!problems.length) {
      const check = (await ask(CORE_CHECK, `Company: ${company}\nStory: ${draft.story}\nShort line: ${draft.short ?? ""}`, key)) as { main_product?: boolean; problems?: string[]; category?: string };
      log[`check${round}`] = check;
      if (PRODUCT_CATEGORIES.includes(check.category as ProductCategory)) draft.category = check.category as ProductCategory;
      if (check.main_product !== false && !check.problems?.length) break;
      if (round >= 1) {
        draft = { story: null };
        break;
      }
      if (check.main_product === false) problems.push("That's a side product. Describe the company's main product line instead.");
      if (check.problems?.length) problems.push(`Fix or remove: ${check.problems.join(" | ")}`);
    }
    draft = (await ask(CORE_SYSTEM, `${base}\n\nYour last draft:\n${JSON.stringify(draft)}\n\nFix these problems and rewrite, keeping every rule:\n- ${problems.join("\n- ")}`, key)) as Partial<ProductInfo>;
    log[`rewrite${round + 1}`] = draft;
  }
  return { ...cleanProduct(draft, text, { quoteOptional: true }), raw: log };
}
