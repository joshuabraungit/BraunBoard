"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { StaleReviewError, submitClientReview } from "@/lib/sponsor";
import { REVIEW_NOTE_MAX } from "@/lib/sponsor-review";

const verdict = z.enum(["up", "down"]);
const schema = z.object({
  ad: z.object({ verdict, note: z.string().max(REVIEW_NOTE_MAX), hash: z.string().min(8).max(64) }).optional(),
  video: z.object({ verdict, note: z.string().max(REVIEW_NOTE_MAX), path: z.string().min(3).max(300) }).optional(),
});

export type SendResult = { ok: true; line: string } | { ok: false; error: string; stale?: boolean };

/** The client's "Send to Josh". Anyone with the link can send; the token is the key. */
export async function sendReview(token: string, payload: unknown): Promise<SendResult> {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: "Something didn't come through. Try again?" };
  try {
    const { row, line } = await submitClientReview(token, parsed.data);
    revalidatePath(`/sponsored/${row.id}`);
    revalidatePath("/admin/sponsored");
    return { ok: true, line };
  } catch (e) {
    if (e instanceof StaleReviewError) return { ok: false, error: e.message, stale: true };
    console.error("[review] send failed", e);
    return { ok: false, error: e instanceof Error && e.message.startsWith("This review link") ? e.message : "Couldn't send. Try again in a minute?" };
  }
}
