"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { subscribe } from "@/lib/picks-subscribe";
import { KIT_COOKIE, KIT_FROM } from "@/lib/kit";

/** Email in, kit unlocked. They also join Braun's Picks (the form says so). */
export async function getKit(formData: FormData) {
  const rawFrom = String(formData.get("from") ?? "");
  const from = KIT_FROM.has(rawFrom) ? rawFrom : "kit-page";
  const back = `/kit${from === "kit-page" ? "" : `?from=${from}`}`;
  const sep = back.includes("?") ? "&" : "?";

  // Honeypot: real people never fill this hidden field. Pretend it worked, unlock nothing.
  if (String(formData.get("website") ?? "")) redirect(`${back}${sep}kit=ok#get-kit`);

  const r = await subscribe(String(formData.get("email") ?? ""), `kit:${from}`);
  if (r !== "ok") redirect(`${back}${sep}kit=invalid#get-kit`);

  (await cookies()).set(KIT_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect(`${back}${sep}kit=ok#get-kit`);
}
