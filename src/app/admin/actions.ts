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
