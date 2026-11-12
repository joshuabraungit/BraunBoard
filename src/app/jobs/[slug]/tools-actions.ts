"use server";
// Server side of the job tools. Every action re-checks who's asking (admins only until
// JOB_TOOLS_PUBLIC=1), loads the job itself rather than trusting the page, and caps paid runs.
// "Say it in their words" works from the résumé saved to the person's account, so it needs
// a sign-in. Résumé contents are never logged.

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCompanyStats, getJob } from "@/lib/data";
import { braunRead } from "@/lib/flags";
import { questionsFor } from "@/lib/questions";
import { loadProductCompanies } from "@/lib/products";
import { getUser } from "@/lib/session";
import { RESUME_MAX_BYTES } from "@/lib/resume-read";
import { canUseTools } from "@/lib/job-tools/gate";
import { claimToolRun, type ToolName } from "@/lib/job-tools/limit";
import { jobContext } from "@/lib/job-tools/context";
import { docxText, pdfText } from "@/lib/job-tools/resume-text";
import { cachedChatter, fetchChatter, type Chatter } from "@/lib/job-tools/chatter";
import { readFit, type Fit } from "@/lib/job-tools/fit";
import { lineFromAnswer, tuneResume, type FactAdd, type Tune } from "@/lib/job-tools/tune";
import { addFact, copyForJob, deleteCopy, deleteFact, deleteSavedResume, getSavedResume, listFacts, saveCopy, saveResume, COPY_MAX_CHARS } from "@/lib/job-tools/words-db";
import { writeLetter, type Letter } from "@/lib/job-tools/letter";
import { buildPrep, isStage, type GapNote, type Prep, type Stage } from "@/lib/job-tools/prep";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };
const fail = (error: string) => ({ ok: false as const, error });

async function allowed(): Promise<boolean> {
  const user = await getUser().catch(() => null);
  return canUseTools(user);
}

async function gate(tool: ToolName, userId?: string): Promise<string | null> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0]!.trim() || h.get("x-real-ip") || "";
  const g = await claimToolRun(ip, tool, userId);
  if (g === "daily") return "That's the limit for today. Come back tomorrow and I'll do more.";
  if (g === "slow") return "That's a lot in one hour. Give it a bit and try again.";
  if (g === "busy") return "These tools are taking a breather today. Try again tomorrow.";
  return null;
}

async function loadJobBits(slug: string) {
  const job = await getJob(slug);
  if (!job) return null;
  const products = await loadProductCompanies().catch(() => null);
  const product = products?.find((c) => c.id === job.company_id && c.story) ?? null;
  return { job, product, text: jobContext(job, product) };
}

const MIN_RESUME = 200;

/** PDF or text in, plain text out. Free (no AI), so no rate limit beyond the size cap. */
export async function readResumeText(formData: FormData): Promise<Result<{ text: string; name: string }>> {
  if (!(await allowed())) return fail("Not available yet.");
  const file = formData.get("resume");
  if (!(file instanceof File) || file.size === 0) return fail("Pick a file first.");
  if (file.size > RESUME_MAX_BYTES) return fail("That file is over 4MB. Try a smaller PDF.");
  const name = file.name.toLowerCase();
  const isPdf = file.type === "application/pdf" || name.endsWith(".pdf");
  const isText = file.type.startsWith("text/") || name.endsWith(".txt");
  const isDocx = name.endsWith(".docx") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (name.endsWith(".doc") && !isDocx) return fail("That's an older Word file. Open it in Word and save as .docx or PDF, then try again.");
  if (!isPdf && !isText && !isDocx) return fail("Upload a PDF or Word file.");
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const text = isPdf ? await pdfText(bytes) : isDocx ? await docxText(bytes) : bytes.toString("utf8");
    if (text.trim().length < MIN_RESUME) return fail("I couldn't pull text out of that one. If it's a scan or an image, export a PDF from Word or Google Docs instead.");
    const user = await getUser().catch(() => null);
    if (user) {
      try {
        await saveResume(user.id, file.name, text);
      } catch (e) {
        console.error("[tools] résumé save failed:", e instanceof Error ? e.message : e);
        return fail("I read it, then couldn't save it to your account. Try again in a minute.");
      }
    }
    return { ok: true, data: { text: text.slice(0, 30000), name: file.name } };
  } catch (e) {
    console.error("[tools] résumé text failed:", e instanceof Error ? e.message : e);
    return fail("Something went wrong reading that file.");
  }
}

export async function peopleSay(slug: string): Promise<Result<Chatter>> {
  if (!(await allowed())) return fail("Not available yet.");
  const job = await getJob(slug);
  if (!job) return fail("Couldn't find that job.");
  const cached = await cachedChatter(job.company_id);
  if (cached) return { ok: true, data: cached };
  const slow = await gate("chatter");
  if (slow) return fail(slow);
  try {
    return { ok: true, data: await fetchChatter({ id: job.company_id, name: job.company_name, domain: job.company_domain }) };
  } catch (e) {
    console.error("[tools] chatter failed:", e instanceof Error ? e.message : e);
    return fail("Couldn't check right now. Try again in a minute.");
  }
}

/** The résumé saved to this account, if there is one. */
export async function myResume(): Promise<Result<{ text: string; name: string } | null>> {
  if (!(await allowed())) return fail("Not available yet.");
  const user = await getUser().catch(() => null);
  if (!user) return { ok: true, data: null };
  const r = await getSavedResume(user.id).catch(() => null);
  return { ok: true, data: r ? { text: r.body, name: r.file_name } : null };
}

export async function forgetResume(): Promise<Result<null>> {
  const user = await getUser().catch(() => null);
  if (!user) return fail("Sign in first.");
  await deleteSavedResume(user.id);
  return { ok: true, data: null };
}

export interface WordsRun extends Tune {
  /** Their saved copy for this job, if they made one before. */
  copy_id: string | null;
}

/** "Say it in their words": suggestions for this job, from their saved résumé and notes. */
export async function tuneForJob(slug: string): Promise<Result<WordsRun>> {
  if (!(await allowed())) return fail("Not available yet.");
  const user = await getUser().catch(() => null);
  if (!user) return fail("Sign in first so I can use your saved résumé.");
  const saved = await getSavedResume(user.id).catch(() => null);
  if (!saved || saved.body.trim().length < MIN_RESUME) return fail("Add your résumé first.");
  const bits = await loadJobBits(slug);
  if (!bits?.job.description_raw) return fail("This posting doesn't have enough text to work with.");
  const slow = await gate("tune", user.id);
  if (slow) return fail(slow);
  try {
    const facts = (await listFacts(user.id).catch(() => [])).map((f) => `${f.want}: ${f.said}`);
    const [tune, copy] = await Promise.all([tuneResume(saved.body, bits.text, facts), copyForJob(user.id, slug).catch(() => null)]);
    return { ok: true, data: { ...tune, copy_id: copy?.id ?? null } };
  } catch (e) {
    console.error("[tools] tune failed:", e instanceof Error ? e.message : e);
    return fail("Something went wrong. Try again in a minute.");
  }
}

/** Before You Apply, step 2: where they fit this job, from their saved résumé and notes. */
export async function fitForJob(slug: string): Promise<Result<Fit>> {
  if (!(await allowed())) return fail("Not available yet.");
  const user = await getUser().catch(() => null);
  if (!user) return fail("Sign in first so I can use your saved résumé.");
  const saved = await getSavedResume(user.id).catch(() => null);
  if (!saved || saved.body.trim().length < MIN_RESUME) return fail("Add your résumé first.");
  const bits = await loadJobBits(slug);
  if (!bits?.job.description_raw) return fail("This posting doesn't have enough text to work with.");
  const slow = await gate("fit", user.id);
  if (slow) return fail(slow);
  try {
    const facts = (await listFacts(user.id).catch(() => [])).map((f) => `${f.want}: ${f.said}`);
    return { ok: true, data: await readFit(saved.body, bits.text, facts) };
  } catch (e) {
    console.error("[tools] fit failed:", e instanceof Error ? e.message : e);
    return fail("Something went wrong. Try again in a minute.");
  }
}

/** A "yes, I have" answer: saved to Things I've done so the résumé copy and prep can use it. */
export async function saveAnswer(want: string, said: string): Promise<Result<null>> {
  if (!(await allowed())) return fail("Not available yet.");
  const user = await getUser().catch(() => null);
  if (!user) return fail("Sign in first.");
  const answer = said.trim().slice(0, 1000);
  if (answer.length < 10) return fail("Tell me a little more about what you did.");
  try {
    await addFact(user.id, want.trim().slice(0, 200), answer);
    revalidatePath("/watchlist");
    return { ok: true, data: null };
  } catch (e) {
    console.error("[tools] save answer failed:", e instanceof Error ? e.message : e);
    return fail("Couldn't save that. Try again in a minute.");
  }
}

/** They said yes to a gap question. Remember it, and turn it into one résumé line. */
export async function answerGap(slug: string, want: string, said: string): Promise<Result<FactAdd>> {
  if (!(await allowed())) return fail("Not available yet.");
  const user = await getUser().catch(() => null);
  if (!user) return fail("Sign in first.");
  const answer = said.trim().slice(0, 1000);
  if (answer.length < 10) return fail("Tell me a little more about what you did.");
  const saved = await getSavedResume(user.id).catch(() => null);
  if (!saved) return fail("Add your résumé first.");
  const bits = await loadJobBits(slug);
  if (!bits) return fail("Couldn't find that job.");
  const slow = await gate("tune_line", user.id);
  if (slow) return fail(slow);
  try {
    await addFact(user.id, want.trim().slice(0, 200), answer);
    const line = await lineFromAnswer(saved.body, bits.text, want, answer);
    if (!line) return fail("I saved that to Things I've done. I couldn't turn it into a line without adding something you didn't say, so write the line yourself below.");
    return { ok: true, data: line };
  } catch (e) {
    console.error("[tools] gap line failed:", e instanceof Error ? e.message : e);
    return fail("Something went wrong. Try again in a minute.");
  }
}

/** Save the copy they built for this job. Only the text they approved arrives here. */
export async function saveWordsCopy(slug: string, body: string): Promise<Result<{ id: string }>> {
  if (!(await allowed())) return fail("Not available yet.");
  const user = await getUser().catch(() => null);
  if (!user) return fail("Sign in first.");
  const text = body.trim();
  if (text.length < MIN_RESUME) return fail("That copy looks empty.");
  if (text.length > COPY_MAX_CHARS) return fail("That copy is too long to save.");
  const job = await getJob(slug);
  if (!job) return fail("Couldn't find that job.");
  try {
    const id = await saveCopy(user.id, { job_slug: slug, company: job.company_name, job_title: job.title_raw, body: text });
    revalidatePath("/watchlist");
    return { ok: true, data: { id } };
  } catch (e) {
    console.error("[tools] save copy failed:", e instanceof Error ? e.message : e);
    return fail("Couldn't save it. Try again in a minute.");
  }
}

export async function removeCopy(formData: FormData): Promise<void> {
  const user = await getUser().catch(() => null);
  if (!user) return;
  await deleteCopy(user.id, String(formData.get("id") ?? ""));
  revalidatePath("/watchlist");
}

export async function removeFact(formData: FormData): Promise<void> {
  const user = await getUser().catch(() => null);
  if (!user) return;
  await deleteFact(user.id, String(formData.get("id") ?? ""));
  revalidatePath("/watchlist");
}

export async function letterForJob(slug: string, resume: string, why: string): Promise<Result<Letter>> {
  if (!(await allowed())) return fail("Not available yet.");
  if (!(await getUser().catch(() => null))) return fail("Sign in first.");
  if (resume.trim().length < MIN_RESUME) return fail("Add your résumé first.");
  const bits = await loadJobBits(slug);
  if (!bits) return fail("Couldn't find that job.");
  const slow = await gate("letter");
  if (slow) return fail(slow);
  try {
    return { ok: true, data: await writeLetter(resume, bits.text, why.slice(0, 600)) };
  } catch (e) {
    console.error("[tools] letter failed:", e instanceof Error ? e.message : e);
    return fail("Something went wrong. Try again in a minute.");
  }
}

/** The signed-in person's "Things I've done", for stories. Best effort. */
async function prepFacts(): Promise<string[]> {
  const user = await getUser().catch(() => null);
  if (!user) return [];
  return (await listFacts(user.id).catch(() => [])).slice(0, 10).map((f) => `${f.want}: ${f.said}`);
}

export interface PrepSheet extends Prep {
  stage: Stage;
  sell: string | null;
  buyer: string | null;
  lights: { tone: "red" | "yellow" | "green"; text: string }[];
  asks: { text: string; why: string }[];
  chatter: Chatter | null;
}

export async function prepForJob(
  slug: string,
  input: { resume: string; stage: string; bio: string; stories: string; gaps?: GapNote[] },
): Promise<Result<PrepSheet>> {
  if (!(await allowed())) return fail("Not available yet.");
  if (!(await getUser().catch(() => null))) return fail("Sign in first.");
  if (!isStage(input.stage)) return fail("Pick which interview this is.");
  if (input.resume.trim().length < MIN_RESUME && input.stories.trim().length < 40) return fail("Add your résumé or write a deal story or two first.");
  const bits = await loadJobBits(slug);
  if (!bits) return fail("Couldn't find that job.");
  const { job, product } = bits;
  const stats = await getCompanyStats(job.company_id).catch(() => null);
  const read = braunRead({ ...job, company: stats });
  // The same lights the job page shows: red flags, then the "ask about it" yellows.
  const lights: PrepSheet["lights"] = [
    ...read.flags.filter((f) => f.tone === "red").map((f) => ({ tone: (f.scored === false ? "yellow" : "red") as "red" | "yellow", text: `${f.label}. ${f.why}` })),
    ...read.checks.filter((c) => c.grade === "bad" || c.grade === "unknown").map((c) => ({ tone: (c.missing || c.grade === "unknown" ? "yellow" : "red") as "red" | "yellow", text: c.detail })),
  ].slice(0, 5);
  const asks = questionsFor({ ...job, flags: read.flags, company: stats }, 4).map((q) => ({ text: q.text, why: q.why }));
  const slow = await gate("prep");
  if (slow) return fail(slow);
  try {
    const prep = await buildPrep({
      jobText: bits.text,
      resume: input.resume,
      stage: input.stage,
      bio: input.bio.slice(0, 4000),
      stories: input.stories.slice(0, 4000),
      lights: lights.map((l) => l.text),
      existingQuestions: asks.map((a) => a.text),
      gaps: (input.gaps ?? [])
        .slice(0, 6)
        .map((g) => ({ want: String(g.want ?? "").slice(0, 160), has: !!g.has, said: g.said ? String(g.said).slice(0, 600) : undefined }))
        .filter((g) => g.want),
      facts: await prepFacts(),
    });
    return {
      ok: true,
      data: {
        ...prep,
        stage: input.stage,
        sell: product ? [product.short, product.story].filter(Boolean).join(". ") : null,
        buyer: job.buyer ?? null,
        lights,
        asks,
        chatter: await cachedChatter(job.company_id),
      },
    };
  } catch (e) {
    console.error("[tools] prep failed:", e instanceof Error ? e.message : e);
    return fail("Something went wrong. Try again in a minute.");
  }
}
