// Cover letter, two ways from one click: a short formal one for the application form,
// and a three-line note to send the hiring manager directly. Opens with them, not "I'm thrilled".
import "server-only";
import { askJson, str } from "./claude";
import { keepBacked, noDashes } from "./guard";

export interface Letter {
  formal: string;
  note: string;
  /** Sentences the guardrails cut for claiming something the résumé doesn't back up. */
  cut: number;
}

const SYSTEM = `You write a cover letter for a salesperson applying to one sales job. It should sound like a sharp human wrote it in 10 minutes, not like AI.

Write two versions:
1. "formal": 4 to 6 sentences, one or two short paragraphs, for the application form. Start with "Dear Hiring Manager," on its own line, end with the person's first name on its own line.
2. "note": 3 short lines max, to send the hiring manager directly by email or LinkedIn. No greeting line, no sign-off.

How to write them:
- Open with an observation about THEM: what they sell, who they sell to, or the problem their buyers have. Use the posting. Not "I'm excited to apply."
- Then ONE proof point from the résumé that fits this job, with its real number if the résumé has one.
- End with a curious question, not a plea. Like "Curious what separates the reps who hit quota there from the ones who don't?" Never "I look forward to hearing from you."
- Only use facts from the résumé and the posting. Never invent a number, customer, award, tool or industry.
- Plain words. No buzzwords ("passionate", "leverage", "synergy", "rockstar", "thrilled"). No em dashes. No exclamation points.
- If the person added a note about why they want this job, use it.

Return ONLY JSON: {"formal": "...", "note": "..."}`;

/** Drop sentences that claim what the résumé and posting don't back up, paragraph by paragraph. */
export function cleanLetter(raw: Record<string, unknown>, allowed: string): Letter {
  let cut = 0;
  const vet = (s: string) =>
    s
      .split(/\n+/)
      .map((p) => {
        const r = keepBacked(noDashes(p), allowed);
        cut += r.removed.length;
        return r.text;
      })
      .filter(Boolean)
      .join("\n\n");
  return { formal: vet(str(raw.formal, 2500)), note: vet(str(raw.note, 600)), cut };
}

export async function writeLetter(resume: string, jobText: string, why: string): Promise<Letter> {
  const { json } = await askJson({
    system: SYSTEM,
    user: `${jobText}\n\n---\nMy résumé:\n${resume.slice(0, 20000)}${why.trim() ? `\n\n---\nWhy I want this job, in my words: ${why.slice(0, 600)}` : ""}`,
    maxTokens: 1500,
  });
  // The greeting and their own words about why are fair game too.
  return cleanLetter(json, `${resume}\n${jobText}\n${why}\nDear Hiring Manager`);
}
