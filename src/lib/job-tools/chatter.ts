// "What are people saying?" A short red / yellow / green read on what people who work at
// a company say about it, from public chatter (Reddit, news, layoff trackers).
// We summarize and link. We never copy reviews, and we skip review sites whose terms say no.
import "server-only";
import { adminClient } from "../supabase/admin";
import { isSupabaseConfigured } from "../supabase/server";
import { arr, askJson, str, type WebSource } from "./claude";

export type Tone = "green" | "yellow" | "red";
export interface ChatterLine {
  tone: Tone;
  text: string;
  url: string;
  source: string;
}
export interface Chatter {
  lines: ChatterLine[];
  /** Not enough out there to say much. */
  thin: boolean;
  checked_at: string;
}

export const CHATTER_DAYS = 14;

// Their terms bar automated use of their reviews, so we don't read or link them.
export const CHATTER_BLOCKED = ["glassdoor.com", "indeed.com", "repvue.com", "comparably.com", "teamblind.com", "kununu.com"];

const SYSTEM = `You help a salesperson size up a company before they apply for a sales job there.
Search the web for what people who work (or worked) at the company say about working there, especially on the sales team.
Good places: Reddit (r/sales and similar), news about layoffs, leadership changes or funding, and layoff trackers.

Return ONLY JSON: {"lines": [{"tone": "green"|"yellow"|"red", "text": "...", "url": "...", "source": "..."}], "thin": true|false}
Rules:
- At most 3 lines. Most important first. Fewer is fine.
- "text": one plain-English sentence, under 120 characters, in your own words. Never quote a review. Say who said it ("Reps on Reddit say...", "News reports...").
- "tone": green = a good sign, yellow = worth asking about, red = a real concern. A single angry post is yellow, not red.
- "url": the exact page you got it from. Only use pages your searches returned.
- "source": short site name, like "Reddit" or "TechCrunch".
- Only things from the last 2 years. Ignore anything about a different company with a similar name.
- If you find little or nothing useful, return fewer lines and "thin": true. Never pad.
- Plain words. No em dashes.`;

const host = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

/** Keep only lines with a real tone, real words, and a link Claude actually saw. Pure, so it's tested. */
export function cleanChatter(raw: Record<string, unknown>, seen: WebSource[], now = new Date()): Chatter {
  const seenUrls = new Set(seen.map((s) => s.url));
  const lines: ChatterLine[] = [];
  for (const r of arr(raw.lines)) {
    const o = (r ?? {}) as Record<string, unknown>;
    const tone = o.tone === "green" || o.tone === "yellow" || o.tone === "red" ? o.tone : null;
    const text = str(o.text, 160).replace(/\s*[—–]\s*/g, ", ");
    const url = str(o.url, 500);
    if (!tone || !text || !url || !seenUrls.has(url)) continue;
    if (CHATTER_BLOCKED.some((d) => host(url) === d || host(url).endsWith(`.${d}`))) continue;
    lines.push({ tone, text, url, source: str(o.source, 40) || host(url) });
    if (lines.length === 3) break;
  }
  return { lines, thin: raw.thin === true || lines.length === 0, checked_at: now.toISOString() };
}

export const isFresh = (checkedAt: string, now = Date.now()) => now - new Date(checkedAt).getTime() < CHATTER_DAYS * 86_400_000;

/** The cached read, if there is a fresh one. Never calls Claude. */
export async function cachedChatter(companyId: string): Promise<Chatter | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data } = await adminClient().from("company_chatter").select("lines, thin, checked_at").eq("company_id", companyId).maybeSingle();
    if (!data || !isFresh(data.checked_at)) return null;
    return data as Chatter;
  } catch {
    return null;
  }
}

export async function fetchChatter(company: { id: string; name: string; domain: string | null }): Promise<Chatter> {
  const { json, sources } = await askJson({
    system: SYSTEM,
    user: `Company: ${company.name}${company.domain ? ` (website: ${company.domain})` : ""}. What do people who work there say?`,
    maxTokens: 3000,
    search: { maxUses: 5, blockedDomains: CHATTER_BLOCKED },
  });
  const out = cleanChatter(json, sources);
  if (isSupabaseConfigured()) {
    // Cache it so 50 people checking the same company is one search, not 50. Missing table just means no cache.
    await adminClient()
      .from("company_chatter")
      .upsert({ company_id: company.id, lines: out.lines, thin: out.thin, checked_at: out.checked_at })
      .then(({ error }) => error && console.warn("[chatter] cache write failed:", error.message));
  }
  return out;
}
