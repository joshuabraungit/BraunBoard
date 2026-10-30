"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { adminClient } from "@/lib/supabase/admin";
import { cancelAndRefund, markLive, resendReceipt, updateSponsorCopy } from "@/lib/sponsor";
import { formatPrice, parseSponsorEdit } from "@/lib/sponsor-form";

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
  try {
    await updateSponsorCopy(id, parsed.edit);
  } catch (e) {
    back(false, e instanceof Error ? e.message : "Couldn't save.");
    return;
  }
  revalidatePath("/");
  revalidatePath(`/sponsored/${id}`);
  back(true, `Saved. ${parsed.edit.job_title} is updated everywhere it shows.`);
}
