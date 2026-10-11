// The ingestion pipeline. Spec section 6:
// Company -> ATS adapter -> raw jobs -> sales classifier -> normalize ->
// extract sales attributes -> dedupe -> store -> match against watches.

import type { SupabaseClient } from "@supabase/supabase-js";
import { adapters } from "./adapters";
import { fetchGreenhousePayRange } from "./adapters/greenhouse";
import { classifyTitle } from "./classify";
import { parseLocation } from "./location";
import { resolveCompensation } from "./compensation";
import { extractAttributes } from "./extract";
import { dedupeKey, descriptionSimilarity, DUPLICATE_THRESHOLD, normalizeLocationKey } from "./dedupe";
import type { AtsProvider, CompanyRef, RawJob } from "./types";
import { jobSlug } from "../slug";
import { matchNewJobs } from "../alerts/match-new-jobs";

/** A job has to be missing from this many consecutive crawls before we call it removed. */
export const MISSES_BEFORE_REMOVAL = 2;

export interface CompanyRow extends CompanyRef {
  slug: string;
}

export interface RunStats {
  seen: number;
  kept: number;
  new: number;
  removed: number;
  error?: string;
}

export async function ingestCompany(db: SupabaseClient, company: CompanyRow): Promise<RunStats> {
  const { data: run } = await db.from("crawl_runs").insert({ company_id: company.id }).select("id").single();
  const stats: RunStats = { seen: 0, kept: 0, new: 0, removed: 0 };

  try {
    const raw = await adapters[company.ats_provider].fetchJobs(company);
    stats.seen = raw.length;

    const { data: existingRows, error: exErr } = await db
      .from("jobs")
      .select("id, source_job_id, is_active, missed_checks")
      .eq("company_id", company.id);
    if (exErr) throw exErr;
    const existing = new Map((existingRows ?? []).map((r) => [r.source_job_id as string, r]));
    const seenIds = new Set<string>();
    const newJobIds: string[] = [];
    const now = new Date().toISOString();

    for (const job of raw) {
      const cls = classifyTitle(job.title);
      if (!cls) continue;
      const loc = parseLocation(job.location, {
        country: job.country_hint,
        region: job.region_hint,
        city: job.city_hint,
        workplace: job.workplace_type,
      });
      if (!loc.is_us) continue;

      stats.kept++;
      seenIds.add(job.source_job_id);
      const prior = existing.get(job.source_job_id);

      if (prior) {
        // Seen again: refresh last_seen_at. If it had been marked removed, bring it back.
        await db
          .from("jobs")
          .update({ last_seen_at: now, missed_checks: 0, is_active: true, removed_at: null })
          .eq("id", prior.id);
        continue;
      }

      const inserted = await insertNewJob(db, company, job, cls, loc);
      if (inserted) {
        stats.new++;
        newJobIds.push(inserted);
      }
    }

    // Anything we didn't see this time gets a strike. Two strikes and it's hidden.
    for (const [sourceId, row] of existing) {
      if (seenIds.has(sourceId) || !row.is_active) continue;
      const misses = (row.missed_checks as number) + 1;
      const removed = misses >= MISSES_BEFORE_REMOVAL;
      await db
        .from("jobs")
        .update({ missed_checks: misses, ...(removed ? { is_active: false, removed_at: now } : {}) })
        .eq("id", row.id);
      if (removed) stats.removed++;
    }

    await db.from("companies").update({ last_crawled_at: now }).eq("id", company.id);
    if (newJobIds.length) await matchNewJobs(db, newJobIds);
  } catch (err) {
    // On a failed crawl we do NOT mark jobs missing. A flaky API shouldn't delete inventory.
    stats.error = err instanceof Error ? err.message : String(err);
  }

  if (run) {
    await db
      .from("crawl_runs")
      .update({
        finished_at: new Date().toISOString(),
        jobs_seen: stats.seen,
        jobs_new: stats.new,
        jobs_removed: stats.removed,
        error: stats.error ?? null,
      })
      .eq("id", run.id);
  }
  return stats;
}

async function insertNewJob(
  db: SupabaseClient,
  company: CompanyRow,
  job: RawJob,
  cls: NonNullable<ReturnType<typeof classifyTitle>>,
  loc: ReturnType<typeof parseLocation>,
): Promise<string | null> {
  // Greenhouse only exposes structured pay per job, so fetch it just for kept jobs.
  let structured = { min: job.salary_min, max: job.salary_max, currency: job.currency };
  if (job.source_provider === "greenhouse") {
    try {
      const pay = await fetchGreenhousePayRange(company.ats_identifier, job.source_job_id);
      if (pay) structured = pay;
    } catch {
      /* pay is optional */
    }
  }
  const comp = resolveCompensation(structured, job.description);
  const attrs = await extractAttributes(job.title, job.description, cls);
  const locKey = normalizeLocationKey(loc.city, loc.state, loc.remote_type);
  const key = dedupeKey(company.id, cls.title_normalized, locKey);

  // Same company + title + location already live under another source id? Compare descriptions.
  let duplicateOf: string | null = null;
  const { data: twins } = await db
    .from("jobs")
    .select("id, description_raw")
    .eq("dedupe_key", key)
    .eq("is_active", true)
    .is("duplicate_of", null)
    .limit(5);
  for (const t of twins ?? []) {
    if (descriptionSimilarity(t.description_raw ?? "", job.description) >= DUPLICATE_THRESHOLD) {
      duplicateOf = t.id as string;
      break;
    }
  }

  const { data, error } = await db
    .from("jobs")
    .insert({
      slug: jobSlug(company.slug, job.title, job.source_job_id),
      company_id: company.id,
      source_job_id: job.source_job_id,
      source_provider: job.source_provider satisfies AtsProvider,
      source_url: job.source_url,
      apply_url: job.apply_url,
      title_raw: job.title,
      title_normalized: cls.title_normalized,
      role_family: attrs.role_family,
      seniority: attrs.seniority,
      sales_segment: attrs.sales_segment,
      location_raw: job.location,
      city: loc.city,
      state: loc.state,
      country: loc.country,
      remote_type: loc.remote_type,
      employment_type: job.employment_type ?? null,
      ...comp,
      description_raw: job.description,
      summary: attrs.summary,
      disclosures: attrs.disclosures,
      sales_motion: attrs.sales_motion,
      self_sourcing_level: attrs.self_sourcing_level,
      customer_segment: attrs.customer_segment,
      dedupe_key: key,
      duplicate_of: duplicateOf,
      // "Remote" with no country stated is kept but flagged for a human to confirm it's US.
      needs_review: loc.country == null,
    })
    .select("id")
    .single();

  if (error) {
    console.warn(`[ingest] insert failed for ${company.name} / ${job.title}: ${error.message}`);
    return null;
  }
  return duplicateOf ? null : (data.id as string);
}

/** Crawl every enabled company that hasn't been crawled in `staleAfterHours`. */
export async function ingestAll(
  db: SupabaseClient,
  { staleAfterHours = 4, limit = 500, concurrency = 4 } = {},
): Promise<{ companies: number; totals: RunStats }> {
  const cutoff = new Date(Date.now() - staleAfterHours * 3_600_000).toISOString();
  const { data: companies, error } = await db
    .from("companies")
    .select("id, slug, name, ats_provider, ats_identifier")
    .eq("is_disabled", false)
    .not("ats_provider", "is", null)
    .or(`last_crawled_at.is.null,last_crawled_at.lt.${cutoff}`)
    .order("last_crawled_at", { ascending: true, nullsFirst: true })
    .limit(limit);
  if (error) throw error;

  const totals: RunStats = { seen: 0, kept: 0, new: 0, removed: 0 };
  const queue = [...((companies ?? []) as CompanyRow[])];
  const worker = async () => {
    for (let c = queue.shift(); c; c = queue.shift()) {
      const s = await ingestCompany(db, c);
      totals.seen += s.seen;
      totals.kept += s.kept;
      totals.new += s.new;
      totals.removed += s.removed;
      console.log(
        `${c.name.padEnd(28)} ${c.ats_provider.padEnd(10)} seen=${s.seen} sales=${s.kept} new=${s.new} removed=${s.removed}${s.error ? ` ERROR ${s.error}` : ""}`,
      );
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  return { companies: companies?.length ?? 0, totals };
}
