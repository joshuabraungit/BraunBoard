"use server";
import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { adminClient } from "@/lib/supabase/admin";
import { attachVideo, cancelAndRefund, createVideoUpload, getOrder, markLive, resendReceipt, reviewFields, updateLinkedInPost, updateLinkedInPost2, updateSponsorCopy, updateVideo2 } from "@/lib/sponsor";
import { adReview, postReview, post2Review } from "@/lib/sponsor-review";
import { formatPrice, parseSponsorEdit } from "@/lib/sponsor-form";
import { loadCodes } from "@/lib/fast-track";

// Canceling goes through cancelOrder so it always refunds.
const STATUSES = ["done"] as const;
const back = (ok: boolean, msg: string) => redirect(`/admin/sponsored?${ok ? "msg" : "err"}=${encodeURIComponent(msg)}`);

export async function goLive(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  let msg: string;
  try {
    const row = await markLive(id);
    const starts = new Date(row.live_at!);
    msg =
      starts > new Date(Date.now() + 60_000)
        ? `${row.job_title} is approved. It goes live ${starts.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" })}. ${row.contact_name} got an email.`
        : `${row.job_title} is live on the home page. ${row.contact_name} got an email with the link.`;
  } catch (e) {
    back(false, e instanceof Error ? e.message : "Couldn't mark it live.");
    return;
  }
  revalidatePath("/admin/sponsored");
  revalidatePath("/");
  revalidateTag("sponsors");
  back(true, msg);
}

export async function setSponsoredStatus(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  if (!(STATUSES as readonly string[]).includes(status)) back(false, "Unknown status");
  const { error } = await adminClient().from("sponsored_jobs").update({ status }).eq("id", id);
  revalidatePath("/admin/sponsored");
  revalidatePath("/");
  revalidateTag("sponsors");
  back(!error, error ? error.message : `Marked ${status}.`);
}

export async function sendReceiptAgain(formData: FormData) {
  await requireAdmin();
  let msg: string;
  try {
    const r = await resendReceipt(String(formData.get("id")));
    msg = `Receipt sent to ${r.to}${r.invoice ? ", with the invoice link." : ". No invoice link was available, so it asks them to reply for one."}`;
  } catch (e) {
    back(false, e instanceof Error ? e.message : "Couldn't send the receipt.");
    return;
  }
  back(true, msg);
}

export async function cancelOrder(formData: FormData) {
  await requireAdmin();
  let msg: string;
  try {
    const r = await cancelAndRefund(String(formData.get("id")), String(formData.get("reason") ?? ""));
    msg = r.refunded > 0 ? `Canceled and refunded ${formatPrice(r.refunded)}. ${r.to} got an email.` : `Canceled. Nothing was charged. ${r.to} got an email.`;
  } catch (e) {
    back(false, e instanceof Error ? e.message : "Couldn't cancel. Nothing was refunded.");
    return;
  }
  revalidatePath("/");
  revalidateTag("sponsors");
  back(true, msg);
}

export async function editCopy(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const parsed = parseSponsorEdit(formData);
  if (!parsed.ok) {
    back(false, `Not saved. ${parsed.error}`);
    return;
  }
  let reReview = false;
  try {
    const before = await getOrder(id);
    await updateSponsorCopy(id, parsed.edit);
    const after = await getOrder(id);
    // They'd weighed in on the old words; the review link now shows the new ones as "Updated" for another look.
    const was = before ? adReview(reviewFields(before)).status : "waiting";
    reReview = (was === "up" || was === "down") && !!after && adReview(reviewFields(after)).status === "changed";
  } catch (e) {
    back(false, e instanceof Error ? e.message : "Couldn't save.");
    return;
  }
  revalidatePath("/");
  revalidateTag("sponsors");
  revalidatePath(`/sponsored/${id}`);
  back(true, `Saved. ${parsed.edit.job_title} is updated everywhere it shows.${reReview ? " The client's review link now shows the new version for her OK." : ""}`);
}

/** Admin video upload, step 1. Returns where the browser should send the file. */
export async function startVideoUpload(id: string, contentType: string): Promise<{ ok: true; path: string; token: string } | { ok: false; error: string }> {
  await requireAdmin();
  try {
    return { ok: true, ...(await createVideoUpload(id, contentType)) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't start the upload." };
  }
}

/** Step 2, once the file is up. */
export async function finishVideoUpload(id: string, path: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  try {
    await attachVideo(id, path);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't save the video." };
  }
  revalidatePath("/admin/sponsored");
  revalidatePath(`/sponsored/${id}`);
  return { ok: true };
}

export async function removeVideo(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  try {
    await attachVideo(id, null);
  } catch (e) {
    back(false, e instanceof Error ? e.message : "Couldn't remove the video.");
    return;
  }
  revalidatePath(`/sponsored/${id}`);
  back(true, "Video removed.");
}

/** Josh pastes the LinkedIn post. It goes on the client's review link for a thumbs up or down. */
export async function saveLinkedInPost(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const text = String(formData.get("linkedin_post") ?? "");
  let msg: string;
  try {
    const before = await getOrder(id);
    await updateLinkedInPost(id, text);
    const after = await getOrder(id);
    const was = before ? postReview(reviewFields(before))?.status : undefined;
    const now = after ? postReview(reviewFields(after))?.status : undefined;
    const first = after?.contact_name.split(" ")[0] ?? "The client";
    msg = !now
      ? "LinkedIn post cleared. It's off the review link."
      : (was === "up" || was === "down") && now === "changed"
        ? `Post saved. ${first}'s review link shows the new version for another look.`
        : `Post saved. It's on ${first}'s review link now. Copy the link and send it over.`;
  } catch (e) {
    back(false, e instanceof Error ? e.message : "Couldn't save the post.");
    return;
  }
  revalidatePath("/admin/sponsored");
  back(true, msg);
}

/** A second LinkedIn post for the same job, with a note to the client shown above it. */
export async function saveLinkedInPost2(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  let msg: string;
  try {
    const before = await getOrder(id);
    await updateLinkedInPost2(id, String(formData.get("linkedin_post_2") ?? ""), String(formData.get("linkedin_post_2_intro") ?? ""));
    const after = await getOrder(id);
    const was = before ? post2Review(reviewFields(before))?.status : undefined;
    const now = after ? post2Review(reviewFields(after))?.status : undefined;
    const first = after?.contact_name.split(" ")[0] ?? "The client";
    msg = !now
      ? "Second post cleared. It's off the review link."
      : (was === "up" || was === "down") && now === "changed"
        ? `Second post saved. ${first}'s review link shows the new version for another look.`
        : `Second post saved. It's on ${first}'s review link now. Copy the link and send it over.`;
  } catch (e) {
    back(false, e instanceof Error ? e.message : "Couldn't save the second post.");
    return;
  }
  revalidatePath("/admin/sponsored");
  back(true, msg);
}

/** The bonus video link (e.g. a history episode). Goes on the review link for a thumbs up or down. */
export async function saveVideo2(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  try {
    await updateVideo2(id, String(formData.get("video2_url") ?? ""));
  } catch (e) {
    back(false, e instanceof Error ? e.message : "Couldn't save the video link.");
    return;
  }
  revalidatePath("/admin/sponsored");
  back(true, "Bonus video saved. It's on the review link now.");
}

/** Turns a sponsor's Fast Track box on or off and sets its details. Blank number of codes = off. */
export async function saveFastTrack(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const totalRaw = String(formData.get("fast_track_total") ?? "").trim();
  const total = totalRaw ? Math.round(Number(totalRaw)) : null;
  if (total != null && !(total >= 1 && total <= 50)) back(false, "Number of codes has to be 1 to 50 (or blank to turn it off).");
  const url = String(formData.get("fast_track_url") ?? "").trim() || null;
  if (url && !/^https?:\/\//i.test(url)) back(false, "The application form link has to start with https://");
  const minsRaw = String(formData.get("fast_track_minutes") ?? "").trim();
  const minutes = minsRaw ? Math.round(Number(minsRaw)) : null;
  if (minutes != null && !(minutes >= 5 && minutes <= 120)) back(false, "Call length has to be 5 to 120 minutes.");
  const where = String(formData.get("fast_track_where") ?? "").trim().slice(0, 500) || null;
  const { error } = await adminClient()
    .from("sponsored_jobs")
    .update({ fast_track_total: total, fast_track_url: url, fast_track_minutes: minutes, fast_track_where: where })
    .eq("id", id);
  if (error) back(false, error.message);
  if (total) {
    try {
      await loadCodes(id, total);
    } catch (e) {
      back(false, e instanceof Error ? e.message : "Couldn't load the codes.");
    }
  }
  revalidatePath("/admin/sponsored");
  revalidatePath(`/sponsored/${id}`);
  revalidatePath("/");
  revalidateTag("sponsors");
  back(true, total ? `Fast Track is on with ${total} codes.` : "Fast Track is off.");
}
