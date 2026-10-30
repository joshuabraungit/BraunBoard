"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { adminClient } from "@/lib/supabase/admin";

const STATUSES = ["paid", "live", "done", "canceled"] as const;

export async function setSponsoredStatus(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  if (!(STATUSES as readonly string[]).includes(status)) redirect("/admin/sponsored?err=Unknown%20status");
  const { error } = await adminClient().from("sponsored_jobs").update({ status }).eq("id", id);
  revalidatePath("/admin/sponsored");
  redirect(`/admin/sponsored?${error ? `err=${encodeURIComponent(error.message)}` : `msg=${encodeURIComponent(`Marked ${status}.`)}`}`);
}
