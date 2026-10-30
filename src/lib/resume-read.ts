// Résumé to For You answers. The file is read once, in memory, and never stored.
// We only fill in what a résumé can actually tell us. Pay and dealbreakers stay the rep's call.

import { firstJsonObject } from "./ingest/buyer";
import { SIZE_BUCKETS, type SizeBucket } from "./ingest/size";
import { COUNTRY_CHOICES, MOTION_CHOICES, ROLE_CHOICES, WORK_CHOICES, type OnboardingAnswers, type RoleChoice } from "./watch-prefs";

export const RESUME_MAX_BYTES = 4 * 1024 * 1024; // Vercel caps a request at about 4.5MB

/** What the form gets back: only the answers we could read, plus a plain summary to show the rep. */
export interface ResumePrefill {
  answers: Partial<Pick<OnboardingAnswers, "roles" | "country" | "work" | "location" | "motion" | "sizes">>;
  saw: { current_role: string | null; years_selling: number | null; sold_to: string | null; industries: string | null };
}

const SYSTEM = `You read a salesperson's résumé and suggest answers for a sales job search form. Only use what the résumé says.
If something isn't clear from the résumé, use null. Never guess.

Return ONLY JSON with these keys:
- "roles": the roles this person would most likely take next, from this list only: ${Object.keys(ROLE_CHOICES).join(", ")}.
  (${Object.entries(ROLE_CHOICES).map(([k, v]) => `${k} = ${v.label}`).join("; ")}.) Base it on their most recent role and level.
  A step up is fine (an SDR with a year or more might also take "ae"). One to three choices.
- "country": where they're based, one of ${Object.keys(COUNTRY_CHOICES).filter((c) => c !== "both").join(", ")}, or null.
- "location": their city or state/province as written on the résumé (max 40 chars), or null.
- "work": "remote" only if their recent roles were clearly remote, otherwise null.
- "motion": "new" if their recent roles were mainly hunting new business, "expansion" if mainly growing existing accounts, or null.
- "sizes": the company sizes they've sold at recently, from: ${SIZE_BUCKETS.join(", ")}. Empty list if unclear.
- "current_role": their most recent job title and company, like "SDR at Acme" (max 60 chars), or null.
- "years_selling": total years in sales roles as a whole number, or null.
- "sold_to": who they sold to, like "operations leaders" or "restaurant owners" (max 60 chars), or null.
- "industries": industries they sold into, like "logistics, SaaS" (max 60 chars), or null.

Do not include pay, salary, age, or anything personal.`;

const short = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

/** Keep only answers that are valid choices. Anything else is dropped, not guessed. */
export function cleanPrefill(raw: Record<string, unknown>): ResumePrefill {
  const answers: ResumePrefill["answers"] = {};
  const roles = Array.isArray(raw.roles) ? raw.roles.filter((r): r is RoleChoice => typeof r === "string" && r in ROLE_CHOICES) : [];
  if (roles.length) answers.roles = [...new Set(roles)].slice(0, 3);
  if (raw.country === "US" || raw.country === "CA" || raw.country === "UK") answers.country = raw.country;
  const loc = short(raw.location, 40);
  if (loc) answers.location = loc;
  if (typeof raw.work === "string" && raw.work in WORK_CHOICES && raw.work !== "any") answers.work = raw.work as OnboardingAnswers["work"];
  if (typeof raw.motion === "string" && raw.motion in MOTION_CHOICES && raw.motion !== "either") answers.motion = raw.motion as OnboardingAnswers["motion"];
  const sizes = Array.isArray(raw.sizes) ? raw.sizes.filter((s): s is SizeBucket => typeof s === "string" && (SIZE_BUCKETS as readonly string[]).includes(s)) : [];
  if (sizes.length) answers.sizes = [...new Set(sizes)];
  const years = typeof raw.years_selling === "number" && raw.years_selling >= 0 && raw.years_selling < 60 ? Math.round(raw.years_selling) : null;
  return {
    answers,
    saw: { current_role: short(raw.current_role, 60), years_selling: years, sold_to: short(raw.sold_to, 60), industries: short(raw.industries, 60) },
  };
}

/** Send the résumé to Claude as a PDF or plain text. Nothing is written anywhere. */
export async function readResume(input: { pdf: Buffer } | { text: string }, key = process.env.ANTHROPIC_API_KEY): Promise<ResumePrefill> {
  if (!key) throw new Error("No API key");
  const content =
    "pdf" in input
      ? [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: input.pdf.toString("base64") } },
          { type: "text", text: "Here's my résumé." },
        ]
      : `Here's my résumé:\n\n${input.text.slice(0, 20000)}`;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.EXTRACTION_MODEL ?? "claude-haiku-5-5",
      max_tokens: 2000,
      system: SYSTEM,
      messages: [{ role: "user", content }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data = (await res.json()) as { content: { type: string; text?: string }[]; stop_reason?: string; model?: string };
  const text = data.content.filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
  if (!text.includes("{"))
    // Shape only, never résumé contents, so the log says why without leaking anything.
    throw new Error(`No JSON in reply (model=${data.model}, stop=${data.stop_reason}, blocks=${data.content.map((c) => c.type).join(",")}, chars=${text.length})`);
  return cleanPrefill((firstJsonObject(text) ?? {}) as Record<string, unknown>);
}
