// Saved résumé, per-job copies and "Things I've done", one account at a time.
// Every query is filtered by the signed-in user's id. Tables have RLS on and no policies.
import "server-only";
import { adminClient } from "../supabase/admin";
import { unwrapLines } from "./words-text";

export interface SavedResume {
  file_name: string;
  body: string;
  updated_at: string;
}
export interface Fact {
  id: string;
  want: string;
  said: string;
  created_at: string;
}
export interface CopyRow {
  id: string;
  job_slug: string;
  company: string;
  job_title: string;
  body: string;
  updated_at: string;
}

export const RESUME_MAX_CHARS = 30000;
export const COPY_MAX_CHARS = 40000;

export async function getSavedResume(userId: string): Promise<SavedResume | null> {
  const { data } = await adminClient().from("saved_resumes").select("file_name, body, updated_at").eq("user_id", userId).maybeSingle();
  const r = (data as SavedResume | null) ?? null;
  return r ? { ...r, body: unwrapLines(r.body) } : null;
}

export async function saveResume(userId: string, fileName: string, body: string): Promise<void> {
  const { error } = await adminClient()
    .from("saved_resumes")
    .upsert({ user_id: userId, file_name: fileName.slice(0, 200), body: unwrapLines(body).slice(0, RESUME_MAX_CHARS), updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function deleteSavedResume(userId: string): Promise<void> {
  await adminClient().from("saved_resumes").delete().eq("user_id", userId);
}

export async function listFacts(userId: string): Promise<Fact[]> {
  const { data } = await adminClient().from("resume_facts").select("id, want, said, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
  return (data as Fact[] | null) ?? [];
}

export const FACTS_MAX = 200;

export async function addFact(userId: string, want: string, said: string): Promise<void> {
  const { count } = await adminClient().from("resume_facts").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if ((count ?? 0) >= FACTS_MAX) throw new Error("Too many saved answers");
  const { error } = await adminClient().from("resume_facts").insert({ user_id: userId, want: want.slice(0, 200), said: said.slice(0, 1000) });
  if (error) throw error;
}

export async function deleteFact(userId: string, id: string): Promise<void> {
  await adminClient().from("resume_facts").delete().eq("user_id", userId).eq("id", id);
}

export async function saveCopy(userId: string, row: { job_slug: string; company: string; job_title: string; body: string }): Promise<string> {
  const { data, error } = await adminClient()
    .from("resume_copies")
    .upsert({ user_id: userId, ...row, body: row.body.slice(0, COPY_MAX_CHARS), updated_at: new Date().toISOString() }, { onConflict: "user_id,job_slug" })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function listCopies(userId: string): Promise<CopyRow[]> {
  const { data } = await adminClient().from("resume_copies").select("id, job_slug, company, job_title, body, updated_at").eq("user_id", userId).order("updated_at", { ascending: false }).limit(100);
  return (data as CopyRow[] | null) ?? [];
}

export async function getCopy(userId: string, id: string): Promise<CopyRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await adminClient().from("resume_copies").select("id, job_slug, company, job_title, body, updated_at").eq("user_id", userId).eq("id", id).maybeSingle();
  return (data as CopyRow | null) ?? null;
}

export async function copyForJob(userId: string, slug: string): Promise<CopyRow | null> {
  const { data } = await adminClient().from("resume_copies").select("id, job_slug, company, job_title, body, updated_at").eq("user_id", userId).eq("job_slug", slug).maybeSingle();
  return (data as CopyRow | null) ?? null;
}

export async function deleteCopy(userId: string, id: string): Promise<void> {
  await adminClient().from("resume_copies").delete().eq("user_id", userId).eq("id", id);
}
