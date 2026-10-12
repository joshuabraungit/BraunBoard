"use server";
import { redirect } from "next/navigation";
import { subscribe } from "@/lib/picks-subscribe";
import { unsubscribe } from "@/lib/picks-subscribe";

export async function joinPicks(formData: FormData) {
  const back = String(formData.get("back") || "/picks");
  // Honeypot: real people never fill this hidden field.
  if (String(formData.get("website") ?? "")) redirect(`${back}${back.includes("?") ? "&" : "?"}picks=ok#picks`);
  const r = await subscribe(String(formData.get("email") ?? ""), String(formData.get("source") ?? "site"));
  redirect(`${back}${back.includes("?") ? "&" : "?"}picks=${r}#picks`);
}

export async function leavePicks(formData: FormData) {
  const id = String(formData.get("s") ?? "");
  const email = await unsubscribe(id);
  redirect(`/picks/unsubscribe?done=${email ? "1" : "0"}`);
}
