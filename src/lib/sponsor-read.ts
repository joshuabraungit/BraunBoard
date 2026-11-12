// The sponsor form no longer asks for job title, remote/hybrid/on-site or location.
// They're in the job description the buyer pastes, so we read them out of it here.
// Josh checks (and can fix) all three in Admin before anything goes live.

import { firstJsonObject } from "./ingest/buyer";
import { REMOTE_TYPES } from "./sponsor-form";

export type RemoteType = (typeof REMOTE_TYPES)[number];
export type JobBasics = { job_title: string; remote_type: RemoteType; location: string | null };

const SYSTEM = `You read a sales job posting and pull out three facts, exactly as the posting states them.
- job_title: the job title (e.g. "Mid-Market Account Executive"). Under 100 characters.
- remote_type: "Remote", "Hybrid" or "On-site". If the posting doesn't say, use "On-site" when it names an office city, otherwise "Remote".
- location: where the job is or who can apply (e.g. "Austin, TX", "US only", "London"). null if the posting doesn't say.
Never guess facts the posting doesn't state. Return ONLY JSON: {"job_title": "...", "remote_type": "...", "location": "..." | null}`;

/** Plain fallback when the model isn't reachable: first short line as the title, keywords for remote. */
export function guessJobBasics(description: string): JobBasics {
  const lines = description.split(/\r?\n/).map((l) => l.replace(/^[#*\-\s]+|[*\s]+$/g, "").trim()).filter(Boolean);
  const titleLine = lines.find((l) => l.length <= 100) ?? "Sales role";
  const t = description.toLowerCase();
  const remote_type: RemoteType = /\bhybrid\b/.test(t) ? "Hybrid" : /\bremote\b/.test(t) ? "Remote" : "On-site";
  return { job_title: titleLine.slice(0, 140), remote_type, location: null };
}

function clean(raw: unknown, fallback: JobBasics): JobBasics {
  const o = (raw ?? {}) as Partial<Record<keyof JobBasics, unknown>>;
  const title = typeof o.job_title === "string" ? o.job_title.trim().slice(0, 140) : "";
  const remote = (REMOTE_TYPES as readonly string[]).includes(String(o.remote_type)) ? (o.remote_type as RemoteType) : fallback.remote_type;
  const loc = typeof o.location === "string" ? o.location.trim().slice(0, 120) : "";
  return { job_title: title || fallback.job_title, remote_type: remote, location: loc || null };
}

/** Never throws and never takes long: the buyer is waiting to get to checkout. */
export async function readJobBasics(description: string, key = process.env.ANTHROPIC_API_KEY, timeoutMs = 8_000): Promise<JobBasics> {
  const fallback = guessJobBasics(description);
  if (!key) return fallback;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.EXTRACTION_MODEL ?? "claude-haiku-5-5",
        max_tokens: 1000,
        system: SYSTEM,
        messages: [{ role: "user", content: description.slice(0, 10_000) }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}`);
    const data = (await res.json()) as { content: { type: string; text?: string }[] };
    return clean(firstJsonObject(data.content.filter((c) => c.type === "text").map((c) => c.text ?? "").join("")), fallback);
  } catch (e) {
    console.error("[sponsor] couldn't read job basics, using a plain guess", e);
    return fallback;
  }
}
