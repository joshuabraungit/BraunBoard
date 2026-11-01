// The ingestion pipeline. Spec section 6:
// Company -> ATS adapter -> raw jobs -> sales classifier -> normalize ->
// extract sales attributes -> dedupe -> store -> match against watches.

import type { SupabaseClient } from "@supabase/supabase-js";
import { adapters } from "./adapters";
import { fetchGreenhousePayRange } from "./adapters/greenhouse";
import { primeWorkable } from "./adapters/workable";
import { classifyTitle, isTalentPool, stripGenderTag, writtenInGerman } from "./classify";
import { canadaPlaceFromTitle, germanyPlaceFrom, parseLocation, titleNamesGermanyOnly, titleNamesCanadaOnly, namesForeignPlace, titleNamesUkOnly, titleOutOfMarket, descriptionPlacesRoleAbroad, ukPlaceFromTitle, type Market, type ParsedLocation } from "./location";
import { payCurrency, resolveCompensation } from "./compensation";
import { extractAttributes } from "./extract";
import { plainRole } from "./role-plain";
import { dedupeKey, descriptionSimilarity, DUPLICATE_THRESHOLD, normalizeLocationKey, sameRole } from "./dedupe";
import type { AtsProvider, CompanyRef, RawJob } from "./types";
import { ENABLED_PROVIDERS } from "./providers";
import { jobSlug } from "../slug";
import { matchNewJobs } from "../alerts/match-new-jobs";

/** A job has to be missing from this many consecutive crawls before we call it removed. */
export const MISSES_BEFORE_REMOVAL = 2;

/** New jobs only go out in alerts if the employer posted them within this many days. */
export const ALERT_MAX_AGE_DAYS = 7;

export interface CompanyRow extends CompanyRef {
  slug: string;
}

/** Pay that changed during a reprocess run, for the run log. */
export const PAY_CHANGES: string[] = [];

export interface RunStats {
  seen: number;
  kept: number;
  new: number;
  removed: number;
  error?: string;
}

export interface IngestOptions {
  /** Re-apply current classification, location and pay rules to jobs already stored. */
  reprocess?: boolean;
}

export async function ingestCompany(db: SupabaseClient, company: CompanyRow, opts: IngestOptions = {}): Promise<RunStats> {
  const { data: run } = await db.from("crawl_runs").insert({ company_id: company.id }).select("id").single();
  const stats: RunStats = { seen: 0, kept: 0, new: 0, removed: 0 };

  try {
    const { data: existingRows, error: exErr } = await db
      .from("jobs")
      .select("id, source_job_id, is_active, missed_checks, classification_overridden, sales_motion, title_raw, salary_min, salary_max, ote_min, ote_max")
      .eq("company_id", company.id);
    if (exErr) throw exErr;
    const existing = new Map((existingRows ?? []).map((r) => [r.source_job_id as string, r]));

    // Active jobs we already store don't need their details re-fetched. Reprocessing re-reads
    // every description, and inactive ones must be re-judged before they come back.
    const known = opts.reprocess
      ? undefined
      : new Set((existingRows ?? []).filter((r) => r.is_active).map((r) => r.source_job_id as string));
    const raw = await adapters[company.ats_provider].fetchJobs(company, { known });
    stats.seen = raw.length;
    const seenIds = new Set<string>();
    const newJobIds: string[] = [];
    const now = new Date().toISOString();

    for (const raw_job of raw) {
      const job = { ...raw_job, title: stripGenderTag(raw_job.title) };
      const prior = existing.get(job.source_job_id);

      // Active, seen again, not reprocessing: it passed our rules when stored, so just confirm it's still up.
      // (Some adapters return known jobs without details, so don't re-judge them here.)
      if (prior && prior.is_active && !opts.reprocess) {
        stats.kept++;
        seenIds.add(job.source_job_id);
        const refresh: Record<string, unknown> = { last_seen_at: now, missed_checks: 0, is_active: true, removed_at: null };
        if (job.posted_at) refresh.source_posted_at = job.posted_at;
        await db.from("jobs").update(refresh).eq("id", prior.id);
        continue;
      }

      const cls = classifyTitle(job.title);
      const loc = locate(job);

      if (!cls || !loc.markets.length || titleOutOfMarket(job.title, loc.markets) || (loc.city == null && descriptionPlacesRoleAbroad(job.description, loc.markets)) || isTalentPool(job.description) || writtenInGerman(job.description)) {
        // No longer in scope under current rules: hide it now when reprocessing,
        // otherwise it ages out after missed checks like any vanished job.
        if (prior && opts.reprocess && prior.is_active) {
          await db.from("jobs").update({ is_active: false, removed_at: now }).eq("id", prior.id);
          seenIds.add(job.source_job_id);
          stats.removed++;
        }
        continue;
      }

      stats.kept++;
      seenIds.add(job.source_job_id);

      if (prior) {
        // Seen again: refresh last_seen_at. If it had been marked removed, bring it back.
        const refresh: Record<string, unknown> = { last_seen_at: now, missed_checks: 0, is_active: true, removed_at: null };
        if (job.posted_at) refresh.source_posted_at = job.posted_at;
        if (opts.reprocess && !prior.classification_overridden) {
          const comp = await payFor(company, job, loc);
          const k = (x: { salary_min: unknown; salary_max: unknown; ote_min: unknown; ote_max: unknown }) => `${x.salary_min ?? "-"}-${x.salary_max ?? "-"}/${x.ote_min ?? "-"}-${x.ote_max ?? "-"}`;
          if (prior.is_active && k(prior as never) !== k(comp)) {
            PAY_CHANGES.push(`${company.name} · ${prior.title_raw}: base/OTE ${k(prior as never)} -> ${k(comp)}`);
            const pick = (x: Record<string, unknown>) => ({ salary_min: x.salary_min ?? null, salary_max: x.salary_max ?? null, ote_min: x.ote_min ?? null, ote_max: x.ote_max ?? null });
            await db.from("pay_audit").insert({ job_id: prior.id, company: company.name, title: prior.title_raw, before: pick(prior), after: pick(comp) });
          }
          Object.assign(refresh, comp, {
            markets: loc.markets,
            role_family: cls.role_family,
            seniority: cls.seniority,
            title_normalized: cls.title_normalized,
            ...(cls.is_channel ? { sales_motion: "Channel" } : prior.sales_motion === "Channel" ? { sales_motion: "Unknown" } : {}),
            ...(cls.sales_segment !== "Unknown" ? { sales_segment: cls.sales_segment } : {}),
            city: loc.city,
            state: loc.state,
            country: loc.country,
            remote_type: loc.remote_type,
            needs_review: loc.country == null,
          });
        }
        await db.from("jobs").update(refresh).eq("id", prior.id);
        continue;
      }

      const inserted = await insertNewJob(db, company, job, cls, loc);
      if (inserted) {
        stats.new++;
        // Alerts are for jobs that are actually new. A months-old posting we only just found
        // (say, from a company we just added) isn't news to anyone watching.
        if (!job.posted_at || Date.now() - new Date(job.posted_at).getTime() <= ALERT_MAX_AGE_DAYS * 86_400_000) newJobIds.push(inserted);
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

    // If the first city of a multi-city role closed, the next oldest open copy takes its place.
    if (stats.removed) await db.rpc("regroup_roles", { p_company: company.id });

    // Every opening on the careers page, not just sales ones: a sanity check on company size.
    await db.from("companies").update({ last_crawled_at: now, open_jobs_total: raw.length }).eq("id", company.id);
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

/** Where a job is open. A title like "AE, Toronto" makes it a Canada role whatever the location field says. */
export function locate(job: RawJob): ParsedLocation {
  const loc = parseLocation(job.location, {
    country: job.country_hint,
    region: job.region_hint,
    city: job.city_hint,
    workplace: job.workplace_type,
  });
  if (titleNamesCanadaOnly(job.title) && !(loc.markets.length === 1 && loc.markets[0] === "CA")) {
    const place = canadaPlaceFromTitle(job.title);
    return { ...loc, city: place.city, state: place.state, country: "CA", markets: ["CA"], is_us: false };
  }
  // Same idea for the UK: "Enterprise AE, UK&I" listed under "New York; London" is a UK role.
  // Only when the location already includes the UK, or doesn't name a country at all.
  if (
    titleNamesUkOnly(job.title) &&
    !(loc.markets.length === 1 && loc.markets[0] === "UK") &&
    (loc.markets.includes("UK") || (loc.country == null && !namesForeignPlace(job.location)))
  ) {
    const place = ukPlaceFromTitle(job.title, job.location);
    return { ...loc, city: place.city, state: place.state, country: "UK", markets: ["UK"], is_us: false };
  }
  // And Germany: "Enterprise AE, DACH" listed under "New York; Munich" is a Germany role.
  if (titleNamesGermanyOnly(job.title) && loc.markets.includes("DE") && !(loc.markets.length === 1 && loc.markets[0] === "DE")) {
    return { ...loc, city: germanyPlaceFrom(job.title, job.location).city, state: null, country: "DE", markets: ["DE"], is_us: false };
  }
  return loc;
}

/** The market whose pay we show: US first, then Canada, the UK, Germany. */
const payMarket = (loc: ParsedLocation): Market =>
  loc.markets.includes("US") ? "US" : loc.markets.includes("CA") ? "CA" : loc.markets.includes("UK") ? "UK" : "DE";
const PAY_SYMBOL = { US: "$", CA: "$", UK: "£", DE: "€" } as const;
const MARKET_CURRENCY_TEXT = { UK: /£|\bGBP\b/, DE: /€|\bEUR\b/ } as const;

/** Pay with the right currency: CAD for Canada-only jobs, GBP for UK-only jobs, unless the posting says otherwise. */
async function payFor(company: CompanyRow, job: RawJob, loc: ParsedLocation) {
  const market = payMarket(loc);
  let structured = await structuredPay(company, job, market);
  // Never guess a currency. Board pay in euros (or anything we don't show) is dropped, and so is
  // board pay with no currency on a UK job unless the posting itself talks in pounds.
  const sc = structured.currency?.trim().toUpperCase() || null;
  const unknownCurrency = sc
    ? !["USD", "CAD", "GBP", "EUR"].includes(sc) || (sc === "EUR" && market !== "DE")
    : (market === "UK" || market === "DE") && !MARKET_CURRENCY_TEXT[market].test(job.description);
  if (structured.min != null && unknownCurrency) structured = { ...structured, min: null, max: null, currency: null };
  const comp = resolveCompensation(structured, job.description, PAY_SYMBOL[market]);
  const hasPay = comp.salary_min != null || comp.ote_min != null;
  return { ...comp, currency: hasPay ? payCurrency(structured.currency, job.description, loc.markets) : null };
}

/** Structured pay from the ATS. Greenhouse only exposes it per job, so it's fetched just for kept jobs. */
async function structuredPay(company: CompanyRow, job: RawJob, market: Market = "US") {
  let structured = { min: job.salary_min, max: job.salary_max, currency: job.currency, isOte: !!job.structured_is_ote };
  if (job.source_provider === "greenhouse") {
    try {
      const pay = await fetchGreenhousePayRange(company.ats_identifier, job.source_job_id, market);
      if (pay) structured = pay;
    } catch {
      /* pay is optional */
    }
  }
  return structured;
}

async function insertNewJob(
  db: SupabaseClient,
  company: CompanyRow,
  job: RawJob,
  cls: NonNullable<ReturnType<typeof classifyTitle>>,
  loc: ReturnType<typeof parseLocation>,
): Promise<string | null> {
  const comp = await payFor(company, job, loc);
  const attrs = await extractAttributes(job.title, job.description, cls);
  // The job in plain English for the job page. Optional: the catch-up script retries misses.
  const rolePlain = await plainRole(job.title, job.description).then(
    (v) => ({ role_plain: v, role_plain_checked_at: new Date().toISOString() }),
    () => ({}),
  );
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

  // Same role already open in another city? Then this is a copy, not a new opening.
  let roleGroup: string | null = null;
  if (!duplicateOf) {
    const { data: siblings } = await db
      .from("jobs")
      .select("id, title_raw, description_raw, markets, remote_type, posted_at, city, state")
      .eq("company_id", company.id)
      .eq("title_normalized", cls.title_normalized)
      .eq("is_active", true)
      .is("duplicate_of", null)
      .is("role_group", null)
      .neq("dedupe_key", key)
      .limit(25);
    const me = {
      title: job.title,
      title_normalized: cls.title_normalized,
      markets: loc.markets,
      remote_type: loc.remote_type,
      posted_at: job.posted_at ?? new Date().toISOString(),
      description: job.description,
      places: [loc.city ?? "", job.location],
    };
    for (const s of siblings ?? []) {
      const them = {
        title: s.title_raw as string,
        title_normalized: cls.title_normalized,
        markets: (s.markets as string[]) ?? [],
        remote_type: s.remote_type as string,
        posted_at: s.posted_at as string | null,
        description: (s.description_raw as string) ?? "",
        places: [(s.city as string) ?? ""],
      };
      if (sameRole(me, them)) {
        roleGroup = s.id as string;
        break;
      }
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
      markets: loc.markets,
      remote_type: loc.remote_type,
      employment_type: job.employment_type ?? null,
      ...comp,
      description_raw: job.description,
      source_posted_at: job.posted_at ?? null,
      summary: attrs.summary,
      ...rolePlain,
      disclosures: attrs.disclosures,
      sales_motion: attrs.sales_motion,
      self_sourcing_level: attrs.self_sourcing_level,
      customer_segment: attrs.customer_segment,
      dedupe_key: key,
      duplicate_of: duplicateOf,
      role_group: roleGroup,
      // "Remote" with no country stated is kept but flagged for a human to confirm it's US.
      needs_review: loc.country == null,
    })
    .select("id")
    .single();

  if (error) {
    console.warn(`[ingest] insert failed for ${company.name} / ${job.title}: ${error.message}`);
    return null;
  }
  // Copies of a role already alerted on don't send another alert.
  return duplicateOf || roleGroup ? null : (data.id as string);
}

export { ENABLED_PROVIDERS };

/** Crawl every enabled company that hasn't been crawled in `staleAfterHours`. */
export async function ingestAll(
  db: SupabaseClient,
  { staleAfterHours = 4, limit = 2000, concurrency = 8, reprocess = false } = {},
): Promise<{ companies: number; totals: RunStats }> {
  const cutoff = new Date(Date.now() - staleAfterHours * 3_600_000).toISOString();
  const { data: companies, error } = await db
    .from("companies")
    .select("id, slug, name, ats_provider, ats_identifier")
    .eq("is_disabled", false)
    .in("ats_provider", ENABLED_PROVIDERS)
    .or(`last_crawled_at.is.null,last_crawled_at.lt.${cutoff}`)
    .order("last_crawled_at", { ascending: true, nullsFirst: true })
    .limit(limit);
  if (error) throw error;

  const totals: RunStats = { seen: 0, kept: 0, new: 0, removed: 0 };
  // Workable is one shared feed: read it once for every Workable company in this run.
  const wk = ((companies ?? []) as CompanyRow[]).filter((c) => c.ats_provider === "workable").map((c) => c.ats_identifier);
  let skipWorkable = false;
  if (wk.length)
    await primeWorkable(wk).catch((e) => {
      // Skip Workable companies this run (no strikes) rather than re-download the feed once per company.
      skipWorkable = true;
      console.warn(`[ingest] Workable feed failed, skipping ${wk.length} Workable companies: ${(e as Error).message}`);
    });
  const queue = ((companies ?? []) as CompanyRow[]).filter((c) => !(skipWorkable && c.ats_provider === "workable"));
  const worker = async () => {
    for (let c = queue.shift(); c; c = queue.shift()) {
      const s = await ingestCompany(db, c, { reprocess });
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
