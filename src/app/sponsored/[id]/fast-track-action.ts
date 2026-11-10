"use server";
import { revalidatePath } from "next/cache";
import { getOrder } from "@/lib/sponsor";
import { isRunning } from "@/lib/sponsor-form";
import { isEmail, isUuid, subscribeOnSignIn } from "@/lib/picks-subscribe";
import { claimCode, fastTrackOn, sendClaimNotice, sendCodeEmail, type FastTrackConfig } from "@/lib/fast-track";

export type ClaimResult = { ok: true; code: string } | { ok: false; error: string; gone?: boolean };

export async function claimFastTrack(_prev: ClaimResult | null, fd: FormData): Promise<ClaimResult> {
  const id = String(fd.get("id") ?? "");
  const name = String(fd.get("name") ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  // Bots fill in every field, people never see this one.
  if (String(fd.get("company_site") ?? "")) return { ok: false, error: "Something went wrong. Try again?" };
  if (!isUuid(id)) return { ok: false, error: "Something went wrong. Try again?" };
  if (name.length < 2) return { ok: false, error: "What's your name?" };
  if (!isEmail(email)) return { ok: false, error: "That email doesn't look right." };

  const s = (await getOrder(id)) as (Awaited<ReturnType<typeof getOrder>> & FastTrackConfig) | null;
  if (!s || !isRunning(s) || !fastTrackOn(s)) return { ok: false, error: "Fast Track is closed for this job.", gone: true };

  let code: string | null;
  try {
    code = await claimCode(s.id, name, email);
  } catch (e) {
    console.error("[fast-track] claim failed", e);
    return { ok: false, error: "Something went wrong on my end. Try again in a minute?" };
  }
  if (!code) return { ok: false, error: "Just missed it. All the codes are claimed.", gone: true };

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://braunboard.com";
  await Promise.all([
    sendCodeEmail(s, email, name, code, `${site}/sponsored/${s.id}/apply?ft=1`).catch((e) => console.error("[fast-track] email failed", e)),
    subscribeOnSignIn(email).catch(() => {}),
    sendClaimNotice(s, name, email, code).catch((e) => console.error("[fast-track] notice failed", e)),
  ]);
  revalidatePath(`/sponsored/${s.id}`);
  revalidatePath("/");
  return { ok: true, code };
}
