// AI extraction of seller-specific attributes. Spec section 8 + 14.
// The model returns structured values only, validated against the allowed
// enums. Anything it can't support from the text comes back as "Unknown".
// Without an API key we fall back to conservative keyword heuristics.

import { z } from "zod";
import { SALES_MOTIONS, SALES_SEGMENTS, SELF_SOURCING_LEVELS, type SalesAttributes } from "./types";
import type { TitleClassification } from "./classify";

export const Disclosures = z.object({
  quota_size: z.boolean(),
  quota_attainment: z.boolean(),
  average_deal_size: z.boolean(),
  territory: z.boolean(),
  sales_cycle: z.boolean(),
});
export type Disclosures = z.infer<typeof Disclosures>;

// Lenient on purpose: an out-of-list value becomes Unknown and a long summary gets trimmed,
// instead of throwing away the whole extraction.
const Extraction = z.object({
  sales_segment: z.enum(SALES_SEGMENTS).catch("Unknown"),
  sales_motion: z.enum(SALES_MOTIONS).catch("Unknown"),
  self_sourcing_level: z.enum(SELF_SOURCING_LEVELS).catch("Unknown"),
  customer_segment: z.enum(SALES_SEGMENTS).catch("Unknown"),
  summary: z.string().transform((v) => (v.length > 280 ? v.slice(0, 277).trimEnd() + "..." : v)),
  disclosures: Disclosures.catch({ quota_size: false, quota_attainment: false, average_deal_size: false, territory: false, sales_cycle: false }),
});

/** Last extraction error, so batch jobs can report why AI calls are failing. */
export let lastExtractionError = "";

export interface Extracted extends SalesAttributes {
  summary: string | null;
  disclosures: Disclosures;
}

const SYSTEM = `You classify B2B sales job postings for a job board used by salespeople.
Return ONLY a JSON object with these keys:
- sales_segment: the segment this rep sells into. One of ${SALES_SEGMENTS.join(", ")}.
- sales_motion: New Logo (net-new acquisition), Expansion (existing customers), Mixed (both), Channel (through partners), or Unknown.
- self_sourcing_level: how much pipeline the rep must generate themselves. High = mostly self-sourced/outbound/prospecting heavy. Medium = mix of inbound/SDR support and self-sourcing. Low = mostly inbound or assigned book. Unknown if not stated.
- customer_segment: the size of customers sold to, same values as sales_segment.
- summary: one or two plain sentences, max 240 chars, written for a salesperson: what you sell, to whom, and how. No hype, no company boilerplate.
- disclosures: booleans for whether the posting EXPLICITLY states each of: quota_size, quota_attainment, average_deal_size, territory, sales_cycle.

Hard rule: never guess. If the posting doesn't support a value, use "Unknown" (or false). Never invent compensation, quota, deal size, attainment or territory facts.`;

export async function extractAttributes(
  title: string,
  description: string,
  cls: TitleClassification,
): Promise<Extracted> {
  const base: SalesAttributes = {
    role_family: cls.role_family,
    seniority: cls.seniority,
    sales_segment: cls.sales_segment,
    sales_motion: cls.is_channel ? "Channel" : "Unknown",
    self_sourcing_level: "Unknown",
    customer_segment: "Unknown",
  };

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { ...base, ...heuristics(description, cls), summary: null };

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.EXTRACTION_MODEL ?? "claude-haiku-5-5",
        max_tokens: 1200,
        system: SYSTEM,
        messages: [
          {
            role: "user",
            content: `Title: ${title}\n\nPosting:\n${description.slice(0, 12_000)}`,
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = (await res.json()) as { content: { type: string; text?: string }[]; stop_reason?: string; model?: string };
    const text = data.content.filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
    // Take the JSON object out of the reply, ignoring any stray text or code fences around it.
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end <= start) {
      throw new Error(
        `No JSON in reply (model=${data.model}, stop=${data.stop_reason}, blocks=${data.content.map((c) => c.type).join(",")}): ${text.slice(0, 200)}`,
      );
    }
    const json = text.slice(start, end + 1);
    const parsed = Extraction.parse(JSON.parse(json));
    return {
      ...base,
      // A segment in the title beats the model's read of the description.
      sales_segment: cls.sales_segment !== "Unknown" ? cls.sales_segment : parsed.sales_segment,
      sales_motion: parsed.sales_motion,
      self_sourcing_level: parsed.self_sourcing_level,
      customer_segment: parsed.customer_segment,
      summary: parsed.summary.trim() || null,
      disclosures: parsed.disclosures,
    };
  } catch (err) {
    lastExtractionError = (err as Error).message;
    console.warn(`[extract] falling back to heuristics for "${title}":`, (err as Error).message);
    return { ...base, ...heuristics(description, cls), summary: null };
  }
}

/** Conservative keyword fallback. Prefers Unknown over a guess. */
export function heuristics(text: string, cls: TitleClassification): Omit<Extracted, keyof SalesAttributes | "summary"> &
  Partial<SalesAttributes> {
  const t = text.toLowerCase();
  const newLogo = /\b(new logo|net[- ]new|new business|hunter|greenfield|acquire new customers)\b/.test(t);
  const expansion = /\b(expansion|upsell|cross[- ]sell|existing customers|install(ed)? base|farmer|renewals?)\b/.test(t);
  const sales_motion = cls.is_channel ? "Channel" : newLogo && expansion ? "Mixed" : newLogo ? "New Logo" : expansion ? "Expansion" : "Unknown";

  const heavy = /\b(self[- ]sourc|outbound|cold call|prospecting|build (your|their) own pipeline|generate (your own )?pipeline)\b/.test(t);
  const inbound = /\b(inbound leads?|warm leads|sdr support|supported by (an? )?(sdr|bdr))\b/.test(t);
  const self_sourcing_level = heavy && inbound ? "Medium" : heavy ? "High" : inbound ? "Low" : "Unknown";

  return {
    sales_motion,
    self_sourcing_level,
    disclosures: {
      quota_size: /\bquota (of|is)\s*\$?\d/.test(t),
      quota_attainment: /\b(attainment|of reps (hit|hitting|achiev))/.test(t),
      average_deal_size: /\b(average (deal|contract) size|acv of|average acv|deal sizes? (of|range))\b/.test(t),
      territory: /\bterritory (is|includes|covers|of)\b/.test(t),
      sales_cycle: /\bsales cycles? (of|is|are|average)\b/.test(t),
    },
  };
}
