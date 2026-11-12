// Before You Apply: where you fit this job, and where you don't. No score.
// Claude reads the posting and the résumé; code throws out any "strength" that claims
// something the person didn't give us, and keeps the questions few and plain.
import "server-only";
import { arr, askJson, str } from "./claude";
import { noDashes, unsupported } from "./guard";

export type LinesUp = "well" | "partly" | "not_much";

export interface FitPoint {
  point: string;
  why: string;
}
export interface FitQuestion {
  /** What the job wants. */
  want: string;
  /** "Have you ...?" */
  ask: string;
}
export interface Fit {
  lines_up: LinesUp;
  /** One plain sentence on the overall picture. */
  summary: string;
  strong: FitPoint[];
  /** Things they may have that the résumé doesn't make clear. */
  explore: FitPoint[];
  /** Things the job wants that nothing on the résumé shows. */
  gaps: FitPoint[];
  /** At most 3, asked before anything gets rewritten. */
  questions: FitQuestion[];
}

export const FIT_SYSTEM = `You help a salesperson decide whether a job is a real fit before they apply. You are honest and kind. You never sell them on the job, and you never talk them out of it. You sort, you don't judge the person.

Read the posting and their résumé (plus any notes they confirmed earlier). Then return:

- "strong": 2 to 4 things the job needs that their résumé clearly shows. "point" says what they've done, in plain words. "why" says which part of the posting it matches.
- "explore": up to 3 things the job wants that they might have, where the résumé hints at it without making it clear. Example: the job sells to CFOs and they've "worked with finance teams".
- "gaps": up to 3 things the job clearly requires that nothing on the résumé shows. Only real requirements, not nice-to-haves.
- "questions": at most 3, drawn from "explore" first, then "gaps". Each is a plain, curious question asking whether they've done it and just didn't write it down. Never assume they have. "want" is the requirement in a few words.
- "lines_up": "well" if the strong points cover what matters most, "partly" if it's mixed, "not_much" if the core of the job is something they haven't done.
- "summary": one plain sentence about the job and their background, never about the person's worth. Example: "Your new-business record lines up well; the open question is whether you've sold to finance leaders."

Rules:
- Use only what the résumé and their notes say. Never add a number, company, title, tool, industry or result.
- Talk to them as "you". Short sentences. Plain words. No em dashes. No score or percentage.
- Don't pad. Fewer, truer points beat more points.

Return ONLY JSON:
{"lines_up": "well|partly|not_much", "summary": "...", "strong": [{"point": "...", "why": "..."}], "explore": [{"point": "...", "why": "..."}], "gaps": [{"point": "...", "why": "..."}], "questions": [{"want": "...", "ask": "..."}]}`;

const points = (v: unknown, max: number): FitPoint[] =>
  arr(v)
    .map((p) => (p ?? {}) as Record<string, unknown>)
    .map((p) => ({ point: noDashes(str(p.point, 240)), why: noDashes(str(p.why, 240)) }))
    .filter((p) => p.point)
    .slice(0, max);

export function cleanFit(raw: Record<string, unknown>, resume: string, facts: string[] = []): Fit {
  const backing = `${resume}\n${facts.join("\n")}`;
  // A strength has to be something they gave us. Gaps and "explore" are about the posting, so they can name what it wants.
  const strong = points(raw.strong, 4).filter((p) => unsupported(p.point, backing).length === 0);
  const explore = points(raw.explore, 3);
  const gaps = points(raw.gaps, 3);
  const questions = arr(raw.questions)
    .map((q) => (q ?? {}) as Record<string, unknown>)
    .map((q) => ({ want: noDashes(str(q.want, 120)), ask: noDashes(str(q.ask, 240)) }))
    .filter((q) => q.want && q.ask)
    .slice(0, 3);
  const lu = str(raw.lines_up, 20);
  const lines_up: LinesUp = lu === "well" || lu === "partly" || lu === "not_much" ? lu : "partly";
  return { lines_up, summary: noDashes(str(raw.summary, 300)), strong, explore, gaps, questions };
}

export async function readFit(resume: string, jobText: string, facts: string[] = []): Promise<Fit> {
  const notes = facts.length ? `\n\n---\nThings I've done (confirmed by me):\n${facts.map((f) => `- ${f}`).join("\n")}` : "";
  const { json } = await askJson({
    system: FIT_SYSTEM,
    user: `${jobText}\n\n---\nMy résumé:\n${resume.slice(0, 20000)}${notes}`,
    maxTokens: 3000,
  });
  return cleanFit(json, resume, facts);
}
