// Interview prep sheet. Most of it is facts the job page already has (what you'd sell,
// who you'd sell to, the lights). Claude only adds the parts that depend on the rep:
// who they're meeting, which of their deals to tell, and questions for this stage.
import "server-only";
import { arr, askJson, str } from "./claude";
import { keepBacked, noDashes } from "./guard";

export const STAGES = {
  recruiter: "Recruiter screen",
  hiring_manager: "Hiring manager",
  panel: "Panel or role play",
  final: "Final round / exec",
} as const;
export type Stage = keyof typeof STAGES;
export const isStage = (v: unknown): v is Stage => typeof v === "string" && v in STAGES;

export interface Story {
  title: string;
  when: string;
  beats: string[];
}
export interface Prep {
  interviewer: string[];
  stories: Story[];
  questions: { text: string; why: string }[];
  /** For things the job wants that they said they haven't done: an honest way to answer. */
  gap_talk: { want: string; say: string }[];
  cut: number;
}

/** What they answered to "have you done this?" in Say it in their words. */
export interface GapNote {
  want: string;
  has: boolean;
  said?: string;
}

const SYSTEM = `You build a one-page interview prep sheet for a salesperson. Bullets only, short enough to glance at mid-call.

Return ONLY JSON:
{
 "interviewer": ["2 to 4 bullets about the person they're meeting"],
 "stories": [{"title": "short name for the deal", "when": "which question this answers, e.g. 'Tell me about a deal you lost'", "beats": ["3 short beats: the situation, what they did, how it ended"]}],
 "questions": [{"text": "a question to ask them", "why": "one short line on what the answer tells you"}],
 "gap_talk": [{"want": "the thing the job wants, as listed", "say": "how to answer honestly if it comes up"}]
}

Rules:
- "interviewer": ONLY from the bio the person pasted. If they pasted nothing, return []. Never guess about someone. Note what they might care about given their role.
- "stories": exactly 2. Pick the deal stories that best fit THIS job, from the stories they wrote or, if none, from their résumé. One win, and one loss or stall if they have one. Never invent a deal, number, customer or outcome.
- "questions": 5 questions tuned to the interview stage. These qualify the JOB, they don't perform for it. Curious, not clever. Use the yellow and red lights and what the posting doesn't say.
  Recruiter screen: process, pay, how the team is set up. Hiring manager: how deals come in, who hits quota and why, how they coach. Panel/role play: what good looks like, what they'll grade. Final/exec: where the business is headed, why this role exists now.
  Don't repeat the questions they already have (listed below).
- "gap_talk": one entry for each item under "They said they haven't done this", and nothing else. "say" is 1 or 2 plain sentences they could say out loud: own that they haven't done it, then point to the closest real thing from their résumé or notes, and end curious about how the team does it. Never imply they've done it. Never invent experience. If nothing on their résumé is close, just own it and ask. Empty list if there are no such items.
- Plain words. No em dashes.`;

export function cleanPrep(raw: Record<string, unknown>, allowedForStories: string, bio: string, gapWants: string[] = []): Prep {
  let cut = 0;
  const backed = (s: string, allowed: string) => {
    const r = keepBacked(noDashes(s), allowed);
    cut += r.removed.length;
    return r.text;
  };
  const interviewer = bio.trim()
    ? arr(raw.interviewer).map((b) => backed(str(b, 200), bio)).filter(Boolean).slice(0, 4)
    : [];
  const stories = arr(raw.stories)
    .map((s) => (s ?? {}) as Record<string, unknown>)
    .map((s) => ({
      title: backed(str(s.title, 80), allowedForStories),
      when: noDashes(str(s.when, 120)),
      beats: arr(s.beats).map((b) => backed(str(b, 220), allowedForStories)).filter(Boolean).slice(0, 4),
    }))
    .filter((s) => s.title && s.beats.length)
    .slice(0, 2);
  const questions = arr(raw.questions)
    .map((q) => (q ?? {}) as Record<string, unknown>)
    .map((q) => ({ text: noDashes(str(q.text, 240)), why: noDashes(str(q.why, 200)) }))
    .filter((q) => q.text)
    .slice(0, 5);
  const wanted = new Set(gapWants.map((w) => w.toLowerCase()));
  const gap_talk = arr(raw.gap_talk)
    .map((g) => (g ?? {}) as Record<string, unknown>)
    .map((g) => ({ want: str(g.want, 160), say: backed(str(g.say, 400), allowedForStories) }))
    .filter((g) => g.want && g.say && wanted.has(g.want.toLowerCase()))
    .slice(0, 5);
  return { interviewer, stories, questions, gap_talk, cut };
}

export async function buildPrep(input: {
  jobText: string;
  resume: string;
  stage: Stage;
  bio: string;
  stories: string;
  lights: string[];
  existingQuestions: string[];
  gaps?: GapNote[];
  /** "Things I've done" they confirmed earlier. */
  facts?: string[];
}): Promise<Prep> {
  const gaps = input.gaps ?? [];
  const facts = [...(input.facts ?? []), ...gaps.filter((g) => g.has && g.said).map((g) => `${g.want}: ${g.said}`)];
  const no = gaps.filter((g) => !g.has).map((g) => g.want);
  const user = [
    input.jobText,
    `---\nInterview stage: ${STAGES[input.stage]}`,
    input.lights.length ? `Lights on this posting:\n${input.lights.map((l) => `- ${l}`).join("\n")}` : "",
    input.existingQuestions.length ? `Questions they already have:\n${input.existingQuestions.map((q) => `- ${q}`).join("\n")}` : "",
    `---\nWho they're meeting (pasted bio):\n${input.bio.trim() ? input.bio.slice(0, 4000) : "(nothing pasted)"}`,
    `---\nTheir deal stories:\n${input.stories.trim() ? input.stories.slice(0, 4000) : "(none written, use the résumé)"}`,
    `---\nTheir résumé:\n${input.resume.trim() ? input.resume.slice(0, 20000) : "(no résumé)"}`,
    facts.length ? `---\nThings they've done that aren't on the résumé (confirmed by them, fine to use in stories):\n${facts.map((f) => `- ${f}`).join("\n")}` : "",
    no.length ? `---\nThey said they haven't done this:\n${no.map((w) => `- ${w}`).join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  const { json } = await askJson({ system: SYSTEM, user, maxTokens: 3000 });
  return cleanPrep(json, `${input.resume}\n${input.stories}\n${facts.join("\n")}`, input.bio, no);
}
