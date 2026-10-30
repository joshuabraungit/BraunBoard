"use server";
// Reads an uploaded résumé to pre-fill the For You form. The file only lives in memory
// for this request. It is never saved, logged or sent anywhere except to Claude to read.

import { RESUME_MAX_BYTES, readResume, type ResumePrefill } from "@/lib/resume-read";

export type ResumeResult = { ok: true; prefill: ResumePrefill } | { ok: false; error: string };

export async function prefillFromResume(formData: FormData): Promise<ResumeResult> {
  const file = formData.get("resume");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Pick a file first." };
  if (file.size > RESUME_MAX_BYTES) return { ok: false, error: "That file is over 4MB. Try a smaller PDF." };

  const name = file.name.toLowerCase();
  const isPdf = file.type === "application/pdf" || name.endsWith(".pdf");
  const isText = file.type.startsWith("text/") || name.endsWith(".txt");
  if (!isPdf && !isText) return { ok: false, error: "Upload a PDF. Using Word? Save it as a PDF first." };

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const prefill = await readResume(isPdf ? { pdf: bytes } : { text: bytes.toString("utf8") });
    if (!Object.keys(prefill.answers).length) return { ok: false, error: "I couldn't read enough from that file. You can fill it in below." };
    return { ok: true, prefill };
  } catch {
    return { ok: false, error: "Something went wrong reading that. You can fill it in below." };
  }
}
