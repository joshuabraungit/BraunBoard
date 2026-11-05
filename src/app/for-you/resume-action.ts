"use server";
// Reads an uploaded résumé to pre-fill the For You form. The file only lives in memory
// for this request. It is never saved, logged or sent anywhere except to Claude to read.

import { headers } from "next/headers";
import { RESUME_MAX_BYTES, readResume, type ResumePrefill } from "@/lib/resume-read";
import { claimResumeRead } from "@/lib/resume-limit";
import { getUser } from "@/lib/session";

export type ResumeResult = { ok: true; prefill: ResumePrefill } | { ok: false; error: string };

export async function prefillFromResume(formData: FormData): Promise<ResumeResult> {
  // Résumé matching is for signed-in people, so I know who they are and can send alerts.
  if (!(await getUser())) return { ok: false, error: "Sign in first and I'll read your résumé." };
  const file = formData.get("resume");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Pick a file first." };
  if (file.size > RESUME_MAX_BYTES) return { ok: false, error: "That file is over 4MB. Try a smaller PDF." };

  const name = file.name.toLowerCase();
  const isPdf = file.type === "application/pdf" || name.endsWith(".pdf");
  const isText = file.type.startsWith("text/") || name.endsWith(".txt");
  if (!isPdf && !isText) return { ok: false, error: "Upload a PDF. Using Word? Save it as a PDF first." };

  // Each read is a paid call to Claude, so cap how often it runs.
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0]!.trim() || h.get("x-real-ip") || "";
  const gate = await claimResumeRead(ip);
  if (gate === "slow") return { ok: false, error: "That's a lot of résumés in an hour. Give it a bit, or fill it in below." };
  if (gate === "busy") return { ok: false, error: "The résumé reader is taking a breather today. You can fill it in below." };

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const prefill = await readResume(isPdf ? { pdf: bytes } : { text: bytes.toString("utf8") });
    if (!Object.keys(prefill.answers).length) return { ok: false, error: "I couldn't read enough from that file. You can fill it in below." };
    return { ok: true, prefill };
  } catch (e) {
    // Log why (never the file or its contents) so failures show up in Vercel logs.
    console.error("[resume] read failed:", e instanceof Error ? e.message : e);
    return { ok: false, error: "Something went wrong reading that. You can fill it in below." };
  }
}
