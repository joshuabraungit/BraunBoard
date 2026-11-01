// "Sells to" in plain English. The buyer line is pulled from the posting, so it often keeps the
// posting's shorthand ("CISOs and AppSec leaders", "AI/ML teams", "MSSPs"). This rewrites only
// those, in words anyone knows. The posting's own words stay on the job page as the quote.

import { firstJsonObject } from "./buyer";
import { roleJargonIn } from "./role-plain";

// Buyer shorthand on top of the sales jargon list. CEO, CFO, IT and HR are common enough to keep.
const BUYER_JARGON =
  /\b(CISOs?|CIOs?|CTOs?|CROs?|CMOs?|CPOs?|COOs?|CDOs?|CxOs?|CX|AppSec|SecOps|DevOps|DevSecOps|MLOps|RevOps|SalesOps|MSSPs?|MSPs?|ISVs?|OEMs?|VARs?|SIs|GSIs?|AI\/ML|ML|GRC|FP&A|GTM|SLED|DTC|D2C|CPG|QSRs?|SOC|OT|ICS|EHS|L&D|HRIS|ERP|ITSM|IAM|SaaS|ICs?|PE|VCs?|LPs?|GPs?|RIAs?|AEC|MEP|digital natives?|AI-native|cloud-native|personas?|verticals?|ecosystem|hyperscalers?)\b/g;

/** Jargon in a buyer line, de-duplicated. Empty means it already reads fine. */
export function buyerJargonIn(text: string): string[] {
  return [...new Set([...(text.match(BUYER_JARGON) ?? []), ...roleJargonIn(text)])];
}

const SYSTEM = `You rewrite a short line about who a salesperson sells to, so anyone can understand it.
Use words a 12-year-old knows. Keep the same people and the same meaning. Never add anything new. Under 10 words.

Examples:
CISOs and AppSec leaders -> heads of security and app security teams
AI/ML teams -> teams building AI
MSSPs and channel partners -> security service firms and resellers
CX leaders -> customer support leaders
Large digital natives and enterprise category leaders -> big online-first companies and industry leaders
Founders and engineering leaders at AI-native startups -> founders and engineering leaders at AI startups
Government agencies, MSSPs, and Fortune 500 firms -> government agencies, security service firms and Fortune 500 companies
CPG brands -> packaged food and household brands
QSR operators -> fast food restaurant owners

Return ONLY JSON: {"plain": "..."}`;

async function ask(user: string, key: string): Promise<string | null> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: process.env.EXTRACTION_MODEL ?? "claude-haiku-5-5", max_tokens: 1000, system: SYSTEM, messages: [{ role: "user", content: user }] }),
    });
    if ([429, 529].includes(res.status) && attempt < 4) {
      await new Promise((r) => setTimeout(r, 5_000 * 2 ** attempt));
      continue;
    }
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = (await res.json()) as { content: { type: string; text?: string }[] };
    const r = firstJsonObject(data.content.filter((c) => c.type === "text").map((c) => c.text ?? "").join("")) as { plain?: string } | null;
    return r?.plain?.trim().replace(/\.\s*$/, "") || null;
  }
}

/**
 * The buyer line without shorthand. Returns the line as-is when it's already plain, and the
 * original when no clean rewrite comes back. Throws on API errors.
 */
export async function plainBuyer(buyer: string, key = process.env.ANTHROPIC_API_KEY): Promise<string> {
  if (!key || !buyerJargonIn(buyer).length) return buyer;
  let draft = await ask(buyer, key);
  if (draft && buyerJargonIn(draft).length) {
    draft = await ask(`${buyer}\n\nYour last try still used: ${buyerJargonIn(draft).join(", ")}. Use plain words instead.`, key);
  }
  if (!draft || buyerJargonIn(draft).length || draft.split(/\s+/).length > 14 || /[—–]/.test(draft)) return buyer;
  // Keep the posting's capital letter at the start so it matches the rest of the site.
  return draft[0]!.toUpperCase() + draft.slice(1);
}
