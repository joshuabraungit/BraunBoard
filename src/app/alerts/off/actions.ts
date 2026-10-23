"use server";
// Turning alerts off (and back on) from the link in an alert email. No sign-in: the signed code is the proof.
import { redirect } from "next/navigation";
import { adminClient } from "@/lib/supabase/admin";
import { readOffToken } from "@/lib/alerts/off";

const back = (t: string, done: string) => redirect(`/alerts/off?t=${encodeURIComponent(t)}&done=${done}`);

export async function alertsOff(formData: FormData) {
  const t = String(formData.get("t") ?? "");
  const all = formData.get("all") === "1";
  const who = readOffToken(t);
  if (!who) back(t, "bad");
  const db = adminClient();
  if (all) {
    await db.from("watches").update({ alert_frequency: "off" }).eq("user_id", who!.userId);
    await db.from("profiles").update({ alert_frequency: "off" }).eq("id", who!.userId);
    back(t, "all");
  }
  if (who!.watchId) {
    const { data } = await db.from("watches").select("alert_frequency").eq("id", who!.watchId).eq("user_id", who!.userId).maybeSingle();
    await db.from("watches").update({ alert_frequency: "off" }).eq("id", who!.watchId).eq("user_id", who!.userId);
    back(t, `one-${data?.alert_frequency === "instant" ? "instant" : "daily"}`);
  }
  // Watched-companies email: those follow the person's own setting.
  await db.from("profiles").update({ alert_frequency: "off" }).eq("id", who!.userId);
  back(t, "one-daily");
}

export async function alertsUndo(formData: FormData) {
  const t = String(formData.get("t") ?? "");
  const was = formData.get("was") === "instant" ? "instant" : "daily";
  const all = formData.get("all") === "1";
  const who = readOffToken(t);
  if (!who) back(t, "bad");
  const db = adminClient();
  if (all) {
    await db.from("watches").update({ alert_frequency: "daily" }).eq("user_id", who!.userId);
    await db.from("profiles").update({ alert_frequency: "daily" }).eq("id", who!.userId);
  } else if (who!.watchId) {
    await db.from("watches").update({ alert_frequency: was }).eq("id", who!.watchId).eq("user_id", who!.userId);
  } else {
    await db.from("profiles").update({ alert_frequency: "daily" }).eq("id", who!.userId);
  }
  back(t, "back");
}
