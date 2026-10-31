// Who's looking, and what they're watching. Server-only.

import { cache } from "react";
import { cookies } from "next/headers";
import { hasAuthCookie } from "./supabase/auth-cookie";
import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured, serverClient } from "./supabase/server";
import { decodeWatchCookie, ONBOARDING_COOKIE, rowToPrefs, type OnboardingAnswers } from "./watch-prefs";
import type { WatchPrefs } from "./match";

/**
 * Who's signed in. Asked once per page load (the menu, saved jobs and watches all
 * share the answer), and not at all when there's no sign-in cookie.
 */
export const getUser = cache(async (): Promise<User | null> => {
  if (!isSupabaseConfigured()) return null;
  if (!hasAuthCookie((await cookies()).getAll())) return null;
  const db = await serverClient();
  const { data } = await db.auth.getUser();
  return data.user ?? null;
});

export interface ActiveWatch {
  id: string | null; // null = anonymous cookie watch, not saved yet
  name: string;
  prefs: WatchPrefs;
  answers: OnboardingAnswers | null;
  alert_frequency: "instant" | "daily" | "off";
}

export interface WatchRow {
  id: string;
  name: string;
  is_primary: boolean;
  alert_frequency: "instant" | "daily" | "off";
  answers: OnboardingAnswers | null;
  created_at: string;
  [k: string]: unknown;
}

export async function listWatches(): Promise<WatchRow[]> {
  const user = await getUser();
  if (!user) return [];
  const db = await serverClient();
  const { data } = await db
    .from("watches")
    .select("*")
    .eq("user_id", user.id)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });
  return (data ?? []) as WatchRow[];
}

/** The signed-in user's chosen (or primary) watch, else the anonymous cookie watch. */
export async function getActiveWatch(watchId?: string): Promise<ActiveWatch | null> {
  const user = await getUser();
  if (user) {
    const watches = await listWatches();
    const w = (watchId && watches.find((x) => x.id === watchId)) || watches.find((x) => x.is_primary) || watches[0];
    if (w) return { id: w.id, name: w.name, prefs: rowToPrefs(w), answers: w.answers ?? null, alert_frequency: w.alert_frequency };
  }
  const cookie = decodeWatchCookie((await cookies()).get(ONBOARDING_COOKIE)?.value);
  if (cookie) return { id: null, name: cookie.name, prefs: cookie.prefs, answers: cookie.answers ?? null, alert_frequency: "daily" };
  return null;
}

export interface UserState {
  signedIn: boolean;
  savedJobIds: Set<string>;
  watchedCompanyIds: Set<string>;
  hiddenJobIds: Set<string>;
}

export async function getUserState(): Promise<UserState> {
  const empty = { savedJobIds: new Set<string>(), watchedCompanyIds: new Set<string>(), hiddenJobIds: new Set<string>() };
  const user = await getUser();
  if (!user) return { signedIn: false, ...empty };
  const db = await serverClient();
  const [saved, companies, hidden] = await Promise.all([
    db.from("saved_jobs").select("job_id").eq("user_id", user.id),
    db.from("company_watches").select("company_id").eq("user_id", user.id),
    db.from("hidden_jobs").select("job_id").eq("user_id", user.id),
  ]);
  return {
    signedIn: true,
    savedJobIds: new Set((saved.data ?? []).map((r) => r.job_id as string)),
    watchedCompanyIds: new Set((companies.data ?? []).map((r) => r.company_id as string)),
    hiddenJobIds: new Set((hidden.data ?? []).map((r) => r.job_id as string)),
  };
}
