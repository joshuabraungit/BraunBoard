"use server";
import { redirect } from "next/navigation";
import { optOut } from "@/lib/email-optout";

export async function leaveEmails(formData: FormData) {
  const ok = await optOut(String(formData.get("t") ?? ""));
  redirect(`/email/unsubscribe?done=${ok ? "1" : "0"}`);
}
