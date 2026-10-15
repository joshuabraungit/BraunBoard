"use server";

import { headers } from "next/headers";
import { submitAsk, type AskStatus } from "@/lib/ask";
import { getJob } from "@/lib/data";
import { getUser } from "@/lib/session";

export async function askJosh(_prev: AskStatus | null, formData: FormData): Promise<AskStatus> {
  // Honeypot: real people never fill this hidden field. Pretend it worked.
  if (String(formData.get("website") ?? "")) return "ok";
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0]!.trim() || h.get("x-real-ip") || "";
  const user = await getUser().catch(() => null);
  return submitAsk(
    {
      email: String(formData.get("email") ?? ""),
      name: String(formData.get("name") ?? ""),
      message: String(formData.get("message") ?? ""),
      offer: String(formData.get("offer") ?? ""),
      jobSlug: String(formData.get("job") ?? ""),
      source: String(formData.get("source") ?? ""),
    },
    { ip, userId: user?.id ?? null, getJob },
  );
}
