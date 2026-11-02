// A second, closer read for quota roles where the first pass couldn't tell hunter from farmer.
// One narrow question, and the model must quote the line that answers it. If the quote isn't
// really in the posting, we don't trust the answer. Not stated stays not stated.

import type { SalesMotion } from "./types";

export interface Reread {
  motion: SalesMotion;
  evidence: string | null;
  /** What the model said, kept for the dry-run log when its answer is thrown out. */
  raw?: string;
}

const PROMPT = `You read one sales job posting and answer one question: is this a hunter role, a farmer role, both, or does the posting not say?

- Hunter: the rep mainly wins brand-new customers (new logos, net-new, new business, building pipeline, prospecting into accounts that don't buy yet).
- Farmer: the rep mainly grows customers the company already has (an assigned book of business, existing accounts, upsell, cross-sell, renewals).
- Both: the posting clearly asks for both.
- Not stated: the posting doesn't say. Generic lines ("drive revenue", "build relationships", "hit quota") are NOT enough. Company boilerplate about the company's own growth is NOT enough.

Never guess. Return JSON only: {"answer": "Hunter" | "Farmer" | "Both" | "Not stated", "evidence": "<the exact sentence or phrase from the posting that decides it, copied word for word, under 30 words; empty if Not stated>"}`;

const TO_MOTION: Record<string, SalesMotion> = { Hunter: "New Logo", Farmer: "Expansion", Both: "Mixed" };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Turn the model's reply into a motion, only if its quote is really in the posting. */
export function parseReread(reply: string, posting: string): Reread {
  const none: Reread = { motion: "Unknown", evidence: null };
  const start = reply.indexOf("{");
  const end = reply.lastIndexOf("}");
  if (start < 0 || end < start) return none;
  let parsed: { answer?: string; evidence?: string };
  try {
    parsed = JSON.parse(reply.slice(start, end + 1));
  } catch {
    return none;
  }
  const motion = TO_MOTION[parsed.answer ?? ""];
  const evidence = (parsed.evidence ?? "").trim();
  if (!motion || norm(evidence).length < 12) return none;
  if (!norm(posting).includes(norm(evidence))) return none;
  return { motion, evidence };
}

export async function rereadMotion(title: string, posting: string, key: string): Promise<Reread> {
  const text = posting.replace(/\s+/g, " ").slice(0, 14_000);
  for (let attempt = 0; ; attempt++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.EXTRACTION_MODEL ?? "claude-haiku-5-5",
        max_tokens: 300,
        system: PROMPT,
        messages: [{ role: "user", content: `Title: ${title}\n\nPosting:\n${text}` }],
      }),
    });
    if ([429, 529].includes(res.status) && attempt < 4) {
      await new Promise((r) => setTimeout(r, 5_000 * 2 ** attempt));
      continue;
    }
    if (!res.ok) throw new Error(`Anthropic ${res.status}`);
    const data = (await res.json()) as { content: { type: string; text?: string }[] };
    const raw = data.content.map((c) => c.text ?? "").join("");
    return { ...parseReread(raw, text), raw };
  }
}
