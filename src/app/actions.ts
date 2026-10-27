"use server";

// Server actions for everything a visitor can change. Browsing never needs an
// account. Onboarding works anonymously (answers live in a cookie so For You
// is useful immediately). Saving, watching and alerts require sign-in.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { serverClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getUser } from "@/lib/session";
import { upsertPrimaryWatch } from "@/lib/watches-db";
import {
  answersToPrefs,
  defaultWatchName,
  encodeWatchCookie,
  OnboardingAnswers,
  ONBOARDING_COOKIE,
  type StoredWatch,
} from "@/lib/watch-prefs";
import type { WatchPrefs } from "@/lib/match";
import { REMOTE_TYPES, ROLE_FAMILIES, SALES_MOTIONS, SALES_SEGMENTS } from "@/lib/ingest/types";
import { isSizeBucket } from "@/lib/ingest/size";

async function requireUser(next: string) {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

function money(v: FormDataEntryValue | null): number | null {
  const n = Number(String(v ?? "").replace(/[^0-9.]/g, ""));
  if (!n) return null;
  return n < 1000 ? Math.round(n * 1000) : Math.round(n); // "275" means $275K
}

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

export async function saveOnboarding(formData: FormData) {
  const answers = OnboardingAnswers.parse({
    roles: formData.getAll("roles"),
    min_base: money(formData.get("min_base")),
    min_ote: money(formData.get("min_ote")),
    work: formData.get("work") ?? "any",
    location: String(formData.get("location") ?? ""),
    country: formData.get("country") ?? "US",
    motion: formData.get("motion") ?? "either",
    dealbreakers: formData.getAll("dealbreakers"),
    sizes: formData.getAll("sizes"),
  });
  const stored: StoredWatch = { name: defaultWatchName(answers), answers, prefs: answersToPrefs(answers) };

  const user = await getUser();
  if (user) {
    await upsertPrimaryWatch(user.id, stored);
  } else {
    (await cookies()).set(ONBOARDING_COOKIE, encodeWatchCookie(stored), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 90,
    });
  }
  revalidatePath("/for-you");
  redirect("/for-you");
}

// ---------------------------------------------------------------------------
// Watches
// ---------------------------------------------------------------------------

function watchCountries(v: string | null): ("US" | "CA" | "UK")[] {
  if (v === "US" || v === "CA" || v === "UK") return [v];
  if (v === "all") return ["US", "CA", "UK"];
  return ["US", "CA"];
}

/** "Watch this search" from All Jobs. Filters come straight from the query string. */
export async function watchSearch(formData: FormData) {
  const qs = String(formData.get("qs") ?? "");
  const user = await requireUser(`/jobs?${qs}`);
  const sp = new URLSearchParams(qs);
  const pick = <T extends string>(v: string | null, allowed: readonly T[]): T[] => (v && allowed.includes(v as T) ? [v as T] : []);
  const prefs: WatchPrefs = {
    role_families: pick(sp.get("role"), ROLE_FAMILIES),
    segments: pick(sp.get("segment"), SALES_SEGMENTS),
    motions: pick(sp.get("motion"), SALES_MOTIONS),
    remote_types: pick(sp.get("remote"), REMOTE_TYPES),
    locations: [],
    keywords: sp.get("q") ? [sp.get("q")!] : [],
    min_base: money(sp.get("minBase")),
    min_ote: money(sp.get("minOte")),
    dealbreakers: [],
    // The jobs page always passes the country it was showing ("NA", "US", "CA", "UK" or "all").
    countries: watchCountries(sp.get("country")),
    company_sizes: ((v) => (isSizeBucket(v) ? [v] : []))(sp.get("size")),
  };
  const name = String(formData.get("name") ?? "").trim() || "My search";
  const db = await serverClient();
  const { count } = await db.from("watches").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  await db.from("watches").insert({ user_id: user.id, name, is_primary: !count, ...prefs });
  revalidatePath("/watchlist");
  redirect("/watchlist?created=1");
}

export async function renameWatch(formData: FormData) {
  const user = await requireUser("/watchlist");
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  if (!name) return;
  const db = await serverClient();
  await db.from("watches").update({ name }).eq("id", String(formData.get("id"))).eq("user_id", user.id);
  revalidatePath("/watchlist");
}

export async function deleteWatch(formData: FormData) {
  const user = await requireUser("/watchlist");
  const db = await serverClient();
  await db.from("watches").delete().eq("id", String(formData.get("id"))).eq("user_id", user.id);
  revalidatePath("/watchlist");
  revalidatePath("/alerts");
}

export async function setAlertFrequency(formData: FormData) {
  const user = await requireUser("/alerts");
  const freq = String(formData.get("frequency"));
  if (!["instant", "daily", "off"].includes(freq)) return;
  const db = await serverClient();
  await db.from("watches").update({ alert_frequency: freq }).eq("id", String(formData.get("id"))).eq("user_id", user.id);
  revalidatePath("/alerts");
}

// ---------------------------------------------------------------------------
// Save job / watch company / hide job
// ---------------------------------------------------------------------------

async function toggle(table: "saved_jobs" | "company_watches" | "hidden_jobs", col: "job_id" | "company_id", formData: FormData) {
  const back = String(formData.get("back") ?? "/");
  const user = await requireUser(back);
  const id = String(formData.get("id"));
  const db = await serverClient();
  if (formData.get("on") === "1") {
    await db.from(table).delete().eq("user_id", user.id).eq(col, id);
  } else {
    await db.from(table).upsert({ user_id: user.id, [col]: id }, { onConflict: `user_id,${col}`, ignoreDuplicates: true });
  }
  revalidatePath(back.split("?")[0]);
  revalidatePath("/watchlist");
}

export async function toggleSaveJob(formData: FormData) {
  await toggle("saved_jobs", "job_id", formData);
}
export async function toggleWatchCompany(formData: FormData) {
  await toggle("company_watches", "company_id", formData);
}
export async function hideJob(formData: FormData) {
  await toggle("hidden_jobs", "job_id", formData);
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function signOut() {
  if (isSupabaseConfigured()) {
    const db = await serverClient();
    await db.auth.signOut();
  }
  redirect("/");
}

