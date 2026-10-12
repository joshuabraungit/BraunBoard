"use server";
// Admin-only server actions. Each one re-checks admin access: server actions are
// public endpoints, so the page-level check isn't enough on its own.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { adminClient } from "@/lib/supabase/admin";
import { adapters } from "@/lib/ingest/adapters";
import { detectByProbing, detectFromUrl } from "@/lib/ingest/detect-ats";
import { ENABLED_PROVIDERS } from "@/lib/ingest/providers";
import { slugify } from "@/lib/slug";

const back = (path: string, msg: string, ok = true) => redirect(`${path}${path.includes("?") ? "&" : "?"}${ok ? "msg" : "err"}=${encodeURIComponent(msg)}`);

export async function setCompanyEnabled(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const enable = formData.get("enable") === "1";
  const returnTo = String(formData.get("returnTo") || "/admin/companies");
  const db = adminClient();
  const { data, error } = await db.from("companies").update({ is_disabled: !enable }).eq("id", id).select("name").single();
  if (error) back(returnTo, error.message, false);
  await db.rpc("refresh_company_stats");
  revalidatePath("/admin/companies");
  back(returnTo, `${data!.name} ${enable ? "is back on. Its jobs show again." : "is switched off. Its jobs are hidden."}`);
}

export async function addCompany(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const careersUrl = String(formData.get("careers_url") ?? "").trim();
  const domain = String(formData.get("domain") ?? "").trim().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "") || null;
  const path = "/admin/companies";
  if (!name) back(path, "Add a company name.", false);

  const db = adminClient();
  const slug = slugify(name);
  const { data: existing } = await db.from("companies").select("id, ats_provider").eq("slug", slug).maybeSingle();
  if (existing?.ats_provider && !careersUrl) back(path, `${name} is already on Braun Board.`, false);

  // Find the board: a careers URL pins it, otherwise guess and verify.
  let found = careersUrl ? detectFromUrl(careersUrl) : null;
  if (careersUrl && !found) back(path, "That careers URL isn't a Greenhouse, Lever or Ashby job board.", false);
  if (found && !ENABLED_PROVIDERS.includes(found.provider)) back(path, `${found.provider} boards are switched off for now.`, false);
  if (!found) {
    const probed = await detectByProbing(name, domain);
    if (!probed?.verified) {
      back(path, `Couldn't find a Greenhouse, Lever or Ashby board for ${name}. Try pasting their careers page URL.`, false);
    }
    found = probed;
  }

  // Make sure the board really has jobs before saving it.
  let count = 0;
  try {
    const jobs = await adapters[found!.provider].fetchJobs({ id: "", name, ats_provider: found!.provider, ats_identifier: found!.identifier });
    count = jobs.length;
  } catch (e) {
    back(path, `Found ${found!.provider}/${found!.identifier} but couldn't read it (${(e as Error).message}).`, false);
  }

  const { error } = await db.from("companies").upsert(
    {
      slug,
      name,
      domain,
      website_url: domain ? `https://${domain}` : null,
      careers_url: careersUrl || null,
      ats_provider: found!.provider,
      ats_identifier: found!.identifier,
      is_disabled: false,
      last_crawled_at: null,
    },
    { onConflict: "slug" },
  );
  if (error) {
    const dup = /ats_provider_ats_identifier/.test(error.message);
    back(path, dup ? "Another company already uses that job board." : error.message, false);
  }
  revalidatePath("/admin/companies");
  back(path, `Added ${name} (${found!.provider}, ${count} open jobs on their board). Its sales jobs show up after the next crawl, within 4 hours.`);
}

export async function deleteUser(formData: FormData) {
  const me = await requireAdmin();
  const id = String(formData.get("id"));
  const email = String(formData.get("email") ?? "");
  const confirm = String(formData.get("confirm") ?? "").trim().toLowerCase();
  if (id === me.id) back("/admin/users", "You can't delete your own account from here.", false);
  if (confirm !== email.toLowerCase()) back("/admin/users", "Type the user's email exactly to confirm.", false);
  const { error } = await adminClient().auth.admin.deleteUser(id);
  if (error) back("/admin/users", error.message, false);
  revalidatePath("/admin/users");
  back("/admin/users", `Deleted ${email} and all their watches, saves and alert history.`);
}

// ---------------------------------------------------------------------------
// Braun's Picks
// ---------------------------------------------------------------------------

async function editableIssue(issueId: string) {
  const { data } = await adminClient().from("picks_issues").select("id, status").eq("id", issueId).maybeSingle();
  if (!data) back("/admin/picks", "That issue doesn't exist.", false);
  if (data!.status === "sent" || data!.status === "sending") back(`/admin/picks/${issueId}`, "This issue already went out, so it can't be changed.", false);
}

export async function buildNextIssue() {
  await requireAdmin();
  const { createDraft } = await import("@/lib/picks-db");
  const r = await createDraft(adminClient());
  back(`/admin/picks/${r.issueId}`, r.created ? `Built the ${r.issueDate} issue with ${r.picks} picks. It's scheduled; change anything you like.` : "That issue already exists. Here it is.");
}

export async function saveIssueText(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  await editableIssue(id);
  const subject = String(formData.get("subject") ?? "").trim();
  const intro = String(formData.get("intro") ?? "").trim();
  const stat = String(formData.get("stat_line") ?? "").trim();
  if (!subject || !intro) back(`/admin/picks/${id}`, "Subject and intro can't be empty.", false);
  await adminClient().from("picks_issues").update({ subject, intro, stat_line: stat || null }).eq("id", id);
  back(`/admin/picks/${id}`, "Saved.");
}

export async function savePickTake(formData: FormData) {
  await requireAdmin();
  const issueId = String(formData.get("issue_id"));
  await editableIssue(issueId);
  const take = String(formData.get("take") ?? "").trim();
  if (!take) back(`/admin/picks/${issueId}`, "A take can't be empty.", false);
  await adminClient().from("picks_items").update({ take }).eq("id", String(formData.get("id"))).eq("issue_id", issueId);
  back(`/admin/picks/${issueId}`, "Take saved.");
}

export async function removePick(formData: FormData) {
  await requireAdmin();
  const issueId = String(formData.get("issue_id"));
  await editableIssue(issueId);
  const db = adminClient();
  await db.from("picks_items").delete().eq("id", String(formData.get("id"))).eq("issue_id", issueId);
  // Renumber the remaining picks 1..n.
  const { data } = await db.from("picks_items").select("id").eq("issue_id", issueId).eq("kind", "pick").order("position");
  await Promise.all((data ?? []).map((r, i) => db.from("picks_items").update({ position: i + 1 }).eq("id", r.id)));
  back(`/admin/picks/${issueId}`, "Removed.");
}

export async function addPick(formData: FormData) {
  await requireAdmin();
  const issueId = String(formData.get("issue_id"));
  await editableIssue(issueId);
  const jobId = String(formData.get("job_id"));
  const { loadCandidates, itemFromCandidate } = await import("@/lib/picks-db");
  const db = adminClient();
  const cand = (await loadCandidates(db)).find((c) => c.id === jobId);
  if (!cand) back(`/admin/picks/${issueId}`, "That job isn't available anymore.", false);
  const { count } = await db.from("picks_items").select("id", { count: "exact", head: true }).eq("issue_id", issueId).eq("kind", "pick");
  await db.from("picks_items").insert({ issue_id: issueId, kind: "pick", position: (count ?? 0) + 1, ...itemFromCandidate(cand!) });
  back(`/admin/picks/${issueId}`, `Added ${cand!.title_raw} at ${cand!.company_name}. Its take is a starting draft; edit it below.`);
}

export async function setIssuePaused(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  await editableIssue(id);
  const pause = formData.get("pause") === "1";
  await adminClient().from("picks_issues").update({ status: pause ? "paused" : "scheduled" }).eq("id", id);
  back(`/admin/picks/${id}`, pause ? "Paused. This issue won't go out unless you resume it." : "Back on schedule.");
}
