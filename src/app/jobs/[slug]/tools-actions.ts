"use server";
// Saved résumé and saved-copy actions (résumé upload, Saved page). Résumé contents are never logged.

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/session";
import { RESUME_MAX_BYTES } from "@/lib/resume-read";
import { canUseTools } from "@/lib/job-tools/gate";
import { docxText, pdfText } from "@/lib/job-tools/resume-text";
import { deleteCopy, deleteFact, deleteSavedResume, getSavedResume, saveResume } from "@/lib/job-tools/words-db";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };
const fail = (error: string) => ({ ok: false as const, error });

async function allowed(): Promise<boolean> {
  const user = await getUser().catch(() => null);
  return canUseTools(user);
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
