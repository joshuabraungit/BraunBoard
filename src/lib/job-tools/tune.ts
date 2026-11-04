// Résumé tune-up: match the posting's words without inventing anything.
// Claude suggests line rewrites; guard.ts throws out any that add a number, name or
// industry the résumé doesn't already have. The match score is counted in code, not guessed.
import "server-only";
import { arr, askJson, str } from "./claude";
import { applyEdits, keywordScore, missingKeywords, noDashes, vetEdits, type Edit } from "./guard";

export interface Gap {
  want: string;
  say: string;
}
export interface Tune {
  keywords: string[];
  edits: Edit[];
  /** Suggestions the guardrails threw out, so we can see how often it tries. Not shown to reps. */
  dropped: number;
  gaps: Gap[];
  score_before: number;
  /** Score if they take every edit. The page recounts as they tick boxes. */
  score_after: number;
}

const SYSTEM = `You help a salesperson tune their résumé for one job posting. You change WORDS, never FACTS.

Step 1. Pick 10 to 15 keywords from the posting that a recruiter or applicant tracking system would scan for: skills, methods, tools, buyer types, sales motions. Short phrases, as the posting writes them.
Step 2. Suggest up to 8 rewrites of lines on the résumé so they use the posting's words where the résumé ALREADY shows the same thing in different words.
  Example: résumé says "found new customers", posting says "new logo acquisition" -> "Won new logos (new logo acquisition)" is fine.
Step 3. List up to 4 things the posting asks for that the résumé doesn't show, and one plain sentence on how to handle each honestly in an interview.

Hard rules for rewrites:
- "before" must be copied EXACTLY from the résumé, word for word. One bullet or sentence, not a whole section.
- Never add a number, company, product, tool, certification, industry, buyer type, title or segment the line doesn't already say.
- Never make it sound like they sold to a different industry, title or company size than they did. Making a line more general is fine.
- Keep it about the same length. Plain words. No em dashes.
- If nothing honest can be changed, return fewer rewrites. Zero is fine.

Return ONLY JSON:
{"keywords": ["..."], "edits": [{"before": "...", "after": "...", "why": "short reason, e.g. uses their phrase 'pipeline generation'"}], "gaps": [{"want": "...", "say": "..."}]}`;

export function cleanTune(raw: Record<string, unknown>, resume: string): Tune {
  const keywords = [...new Set(arr(raw.keywords).map((k) => str(k, 50)).filter(Boolean))].slice(0, 15);
  const proposed = arr(raw.edits)
    .map((e) => (e ?? {}) as Record<string, unknown>)
    .map((e) => ({ before: str(e.before, 600), after: noDashes(str(e.after, 600)), why: noDashes(str(e.why, 160)) }));
  const { kept, dropped } = vetEdits(resume, proposed);
  const edits = kept.slice(0, 8);
  const gaps = arr(raw.gaps)
    .map((g) => (g ?? {}) as Record<string, unknown>)
    .map((g) => ({ want: str(g.want, 120), say: noDashes(str(g.say, 240)) }))
    .filter((g) => g.want && g.say)
    // A "gap" the résumé already covers isn't a gap.
    .filter((g) => missingKeywords([g.want], resume).length > 0)
    .slice(0, 4);
  return {
    keywords,
    edits,
    dropped: dropped.length,
    gaps,
    score_before: keywordScore(keywords, resume),
    score_after: keywordScore(keywords, applyEdits(resume, edits)),
  };
}

export async function tuneResume(resume: string, jobText: string): Promise<Tune> {
  const { json } = await askJson({
    system: SYSTEM,
    user: `${jobText}\n\n---\nMy résumé:\n${resume.slice(0, 20000)}`,
    maxTokens: 4000,
  });
  return cleanTune(json, resume);
}
