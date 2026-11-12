// "Say it in their words": match the posting's words without inventing anything.
// Claude suggests line rewrites; guard.ts throws out any that add a number, name or
// industry the person didn't give us. The match score is counted in code, not guessed.
// Instead of guessing, it asks: for a number when a line would be stronger with one,
// and "have you done this?" for things the job wants that the résumé doesn't show.
import "server-only";
import { arr, askJson, str } from "./claude";
import { applyEdits, keywordScore, missingKeywords, noDashes, norm, unsupported, vetEdits, type Edit } from "./guard";

export interface TuneEdit extends Edit {
  /** A question asking for a number this line could use. Empty when it doesn't need one. */
  ask: string;
}
export interface Gap {
  want: string;
  /** "Have you ...?" in plain words. */
  ask: string;
}
/** A new line built from something the person told us earlier ("Things I've done"). */
export interface FactAdd {
  text: string;
  after: string;
  why: string;
}
export interface Tune {
  keywords: string[];
  edits: TuneEdit[];
  /** Suggestions the guardrails threw out, so we can see how often it tries. Not shown to reps. */
  dropped: number;
  gaps: Gap[];
  adds: FactAdd[];
  score_before: number;
  /** Score if they take every edit. The page recounts as they choose. */
  score_after: number;
}

export const TUNE_SYSTEM = `You help a salesperson describe their real experience in the words one job posting uses. You change WORDS, never FACTS.

Step 1. Pick 10 to 15 keywords from the posting: the phrases it repeats or leans on (skills, methods, tools, buyer types, sales motions). Short phrases, as the posting writes them.
Step 2. Suggest up to 8 rewrites of lines on the résumé so they use the posting's words where the résumé ALREADY shows the same thing in different words.
  Example: résumé says "found new customers", posting says "new logo acquisition" -> "Won new logos through outbound prospecting" is fine only if the line already says they found new customers themselves.
  If a rewrite would be stronger with a number the résumé doesn't give, do NOT add one. Put a short question in "ask" instead, like "About how many new accounts did you open?". Otherwise leave "ask" empty.
Step 3. List up to 4 things the posting asks for that the résumé doesn't show. For each, write "ask": a plain, friendly question asking whether they've done it and just didn't write it down. Don't assume they have.
Step 4. Under "Things I've done" you may get notes the person confirmed earlier. Where one matches what this posting wants and isn't already on the résumé, suggest it as a new résumé line in "adds", using only what the note says. "after" must be copied exactly from the résumé: the line it belongs under (usually that job's title line). Zero adds is fine.

Hard rules:
- "before" and "after" (in adds) must be copied EXACTLY from the résumé, word for word. One bullet or sentence, not a whole section.
- Never add a number, company, product, tool, certification, industry, buyer type, title or segment the person didn't give.
- Never make a small part of a job sound like the whole job, or like they sold to a different industry, title or company size than they did.
- Keep it about the same length. Plain words. No em dashes.
- Work their words into the sentence naturally. Never tack keywords on in parentheses.
- Skip rewrites that only swap a synonym without making the line clearer to this hiring manager.
- If nothing honest can be changed, return fewer rewrites. Zero is fine.

Return ONLY JSON:
{"keywords": ["..."], "edits": [{"before": "...", "after": "...", "why": "uses their phrase 'pipeline generation'", "ask": ""}], "gaps": [{"want": "...", "ask": "..."}], "adds": [{"text": "...", "after": "...", "why": "..."}]}`;

export function cleanTune(raw: Record<string, unknown>, resume: string, facts: string[] = []): Tune {
  const keywords = [...new Set(arr(raw.keywords).map((k) => str(k, 50)).filter(Boolean))].slice(0, 15);
  const proposed = arr(raw.edits)
    .map((e) => (e ?? {}) as Record<string, unknown>)
    .map((e) => ({ before: str(e.before, 600), after: noDashes(str(e.after, 600)), why: noDashes(str(e.why, 160)), ask: noDashes(str(e.ask, 160)) }));
  const { kept, dropped } = vetEdits(resume, proposed);
  const askFor = new Map(proposed.map((p) => [norm(p.before), p.ask]));
  const edits: TuneEdit[] = kept.slice(0, 8).map((e) => ({ ...e, ask: askFor.get(e.before) ?? "" }));

  const factText = facts.join("\n");
  const gaps = arr(raw.gaps)
    .map((g) => (g ?? {}) as Record<string, unknown>)
    .map((g) => ({ want: str(g.want, 120), ask: noDashes(str(g.ask, 240)) }))
    .filter((g) => g.want && g.ask)
    // A "gap" the résumé or their notes already cover isn't a gap.
    .filter((g) => missingKeywords([g.want], `${resume}\n${factText}`).length > 0)
    .slice(0, 4);

  const resumeNorm = norm(resume);
  const adds = facts.length
    ? arr(raw.adds)
        .map((a) => (a ?? {}) as Record<string, unknown>)
        .map((a) => ({ text: noDashes(str(a.text, 400)), after: norm(str(a.after, 600)), why: noDashes(str(a.why, 160)) }))
        .filter((a) => a.text && a.after && resumeNorm.includes(a.after))
        // Every claim in a new line has to come from their own notes or résumé.
        .filter((a) => unsupported(a.text, `${resume}\n${factText}`).length === 0)
        .slice(0, 3)
    : [];

  return {
    keywords,
    edits,
    dropped: dropped.length,
    gaps,
    adds,
    score_before: keywordScore(keywords, resume),
    score_after: keywordScore(keywords, applyEdits(resume, edits)),
  };
}

export function tuneMessage(resume: string, jobText: string, facts: string[] = []): string {
  const notes = facts.length ? `\n\n---\nThings I've done (confirmed by me):\n${facts.map((f) => `- ${f}`).join("\n")}` : "";
  return `${jobText}\n\n---\nMy résumé:\n${resume.slice(0, 20000)}${notes}`;
}

/** The model's answer before the guardrails, for testing. */
export async function tuneRaw(resume: string, jobText: string, facts: string[] = []): Promise<Record<string, unknown>> {
  const { json } = await askJson({ system: TUNE_SYSTEM, user: tuneMessage(resume, jobText, facts), maxTokens: 4500 });
  return json;
}

export async function tuneResume(resume: string, jobText: string, facts: string[] = []): Promise<Tune> {
  return cleanTune(await tuneRaw(resume, jobText, facts), resume, facts);
}

// ---- A new line from a gap answer ----

const LINE_SYSTEM = `A salesperson just told you about something they've done that their résumé doesn't show. Write ONE résumé bullet from it.

Rules:
- Use only what they said. Never add a number, company, tool, industry, title or result they didn't say.
- Say what they did, not what it proves. No "building confidence", "showing strong skills", "high-volume" or other claims about what it taught them, unless they said it.
- If what they said doesn't actually answer the question they were asked, still write the line from what they said. Never stretch it to fit the question.
- Use the job posting's words where they honestly fit.
- Short: under 25 words. Start with a verb. No em dashes.
- "after": copy EXACTLY, word for word, the résumé line this belongs under (usually the job title line of the role it happened in). If you can't tell, use "".

Return ONLY JSON: {"text": "...", "after": "..."}`;

export function cleanLine(raw: Record<string, unknown>, resume: string, said: string): FactAdd | null {
  const text = noDashes(str(raw.text, 300)).replace(/^[•\-*]\s*/, "");
  if (!text) return null;
  if (unsupported(text, `${said}\n${resume}`).length) return null;
  const after = norm(str(raw.after, 600));
  return { text, after: after && norm(resume).includes(after) ? after : "", why: "from what you told me" };
}

export async function lineFromAnswer(resume: string, jobText: string, want: string, said: string): Promise<FactAdd | null> {
  const { json } = await askJson({
    system: LINE_SYSTEM,
    user: `${jobText}\n\n---\nMy résumé:\n${resume.slice(0, 20000)}\n\n---\nThey asked about: ${want}\nWhat I did: ${said}`,
    maxTokens: 2000,
  });
  return cleanLine(json, resume, said);
}
