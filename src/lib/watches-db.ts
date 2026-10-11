import "server-only";
import { serverClient } from "./supabase/server";
import type { StoredWatch } from "./watch-prefs";

/** Create or replace the user's primary watch. Server-only: never expose as an action. */
export async function upsertPrimaryWatch(userId: string, w: StoredWatch) {
  const db = await serverClient();
  const row = { user_id: userId, name: w.name, answers: w.answers ?? null, is_primary: true, ...w.prefs };
  const { data: existing } = await db.from("watches").select("id").eq("user_id", userId).eq("is_primary", true).maybeSingle();
  if (existing) await db.from("watches").update(row).eq("id", existing.id);
  else await db.from("watches").insert(row);
}
