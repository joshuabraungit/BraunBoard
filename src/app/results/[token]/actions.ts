"use server";

import { redirect } from "next/navigation";
import { saveClientResults } from "@/lib/sponsor";
import { parseCount } from "@/lib/sponsor-results";

export async function sendResults(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (!/^[a-f0-9]{64}$/.test(token)) redirect("/");
  const applications = parseCount(formData.get("applications"));
  const interviews = parseCount(formData.get("interviews"));
  if (applications === "bad" || interviews === "bad") redirect(`/results/${token}?err=number#yours`);
  const note = String(formData.get("note") ?? "");
  if (applications === null && interviews === null && !note.trim()) redirect(`/results/${token}?err=empty#yours`);
  try {
    await saveClientResults(token, { applications, interviews, note });
  } catch {
    redirect(`/results/${token}?err=save#yours`);
  }
  redirect(`/results/${token}?sent=1#yours`);
}
