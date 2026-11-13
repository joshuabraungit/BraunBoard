"use server";
// Server side of 3-2-1 Interview Prep. Every action re-checks who's asking (everyone unless
// JOB_TOOLS_PUBLIC=0), loads the job itself rather than trusting the page, and caps paid runs.
// Prep works from the résumé saved to the person's account, so it needs a sign-in.
// Résumé contents are never logged.

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
import { deleteCopy, deleteFact, deleteSavedResume, getSavedResume, listFacts, saveResume } from "@/lib/job-tools/words-db";
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
  /** 3-2-1: the one question to ask. The one that tells them most whether the job is real. */
  one: { text: string; why: string };
}

const ATTAINMENT_Q = { text: "What percentage of the team hit quota last year?", why: "If they can't answer, that's an answer." };

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
        // Attainment first: it's the question that sorts real jobs from shaky ones. If the posting
        // already answers it, the next question from the job page's list.
        one: asks.find((a) => /quota/i.test(a.text)) ? { ...asks.find((a) => /quota/i.test(a.text))!, why: ATTAINMENT_Q.why } : (asks[0] ?? prep.questions[0] ?? ATTAINMENT_Q),
      },
    };
  } catch (e) {
    console.error("[tools] prep failed:", e instanceof Error ? e.message : e);
    return fail("Something went wrong. Try again in a minute.");
  }
}
