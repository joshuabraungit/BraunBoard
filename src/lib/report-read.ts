// Job Market Report: read one posting for what it says about pay and the details that decide
// whether the pay is reachable. Every "yes" must quote the posting word for word, or it's a "no".

import { firstJsonObject, quoteInPosting } from "./ingest/buyer";

export const REPORT_ITEMS = ["base", "variable", "quota", "attainment", "deal_size", "sales_cycle", "ramp", "accelerators", "clawbacks"] as const;
export type ReportItem = (typeof REPORT_ITEMS)[number];
export type ReportRead = Record<ReportItem, string | null>; // the supporting quote, or null

const SYSTEM = `You read a sales job posting and report what it says about THIS job. For each item, give the exact sentence
from the posting that states it, copied character for character (max 250 chars), or null if the posting doesn't state it.

Items:
- "base": a base salary amount or range for this job (a number).
- "variable": an amount for the commission / variable / bonus / OTE / on-target or total target pay for this job
  (a number, or a percent of base). Not just "commission eligible" or "uncapped commission" without a number.
- "quota": the size of this job's quota or sales target (a number, e.g. "$1M annual quota", "15 meetings a month").
- "attainment": how many or what share of the team hits quota (a team result, e.g. "70% of reps hit quota").
- "deal_size": the typical deal size / ACV this job sells (a number).
- "sales_cycle": how long this job's sales cycle is (a length of time, e.g. "60-90 day cycles").
- "ramp": a ramp period for new hires (a length of time or a reduced quota while ramping).
- "accelerators": higher commission rates above quota, by name or description.
- "clawbacks": commission being taken back (clawbacks, charge-backs).

Rules:
- Only what the posting says about THIS job and team. Requirements about the candidate's past do NOT count
  ("history of quota attainment", "closed deals over $100K", "exceeded $1M quota" are about the candidate).
- Generic phrases with no number don't count for base, variable, quota, deal_size, sales_cycle or ramp.
- Never guess. If unsure, null.

Return ONLY JSON: {"base": ..., "variable": ..., "quota": ..., "attainment": ..., "deal_size": ..., "sales_cycle": ..., "ramp": ..., "accelerators": ..., "clawbacks": ...}`;

export async function readPosting(
  title: string,
  company: string,
  posting: string,
  key = process.env.ANTHROPIC_API_KEY,
): Promise<{ read: ReportRead; tokensIn: number; tokensOut: number }> {
  const text = posting.slice(0, 14000);
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key!, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.EXTRACTION_MODEL ?? "claude-haiku-5-5",
      max_tokens: 1500,
      system: SYSTEM,
      messages: [{ role: "user", content: `Job: ${title} at ${company}\n\nPosting:\n${text}` }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { content: { type: string; text?: string }[]; usage?: { input_tokens: number; output_tokens: number } };
  const raw = (firstJsonObject(data.content.filter((c) => c.type === "text").map((c) => c.text ?? "").join("")) ?? {}) as Record<string, unknown>;
  return { read: cleanRead(raw, text), tokensIn: data.usage?.input_tokens ?? 0, tokensOut: data.usage?.output_tokens ?? 0 };
}

/** Keep a "yes" only when its quote is really in the posting. */
export function cleanRead(raw: Record<string, unknown>, posting: string): ReportRead {
  const out = {} as ReportRead;
  for (const k of REPORT_ITEMS) {
    const q = typeof raw[k] === "string" ? (raw[k] as string).trim() : null;
    out[k] = q && quoteInPosting(q, posting) ? q : null;
  }
  return out;
}
