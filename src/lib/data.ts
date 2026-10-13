// Read-side queries for pages. Falls back to sample data when Supabase isn't
// configured, so the UI can be developed before the database exists.

import { isSupabaseConfigured, serverClient } from "./supabase/server";
import { SAMPLE_COMPANIES, SAMPLE_JOBS } from "./sample-data";
import type { RemoteType, RoleFamily, SalesMotion, SalesSegment, SelfSourcingLevel, Seniority } from "./ingest/types";
import type { Disclosures } from "./ingest/extract";

export interface JobView {
  id: string;
  slug: string;
  title_raw: string;
  role_family: RoleFamily;
  seniority: Seniority;
  sales_segment: SalesSegment;
  sales_motion: SalesMotion;
  self_sourcing_level: SelfSourcingLevel;
  customer_segment: SalesSegment;
  remote_type: RemoteType;
  location_raw: string | null;
  city: string | null;
  state: string | null;
  salary_min: number | null;
  salary_max: number | null;
  ote_min: number | null;
  ote_max: number | null;
  summary: string | null;
  description_raw: string | null;
  disclosures: Partial<Disclosures>;
  /** Red / green flag codes, see lib/flags.ts */
  flags?: string[];
  /** "USD" or "CAD" when pay is published. */
  currency?: string | null;
  /** Where the job is open: "US", "CA" or both. */
  markets?: string[];
  apply_url: string;
  /** When the employer posted it (falls back to when we first saw it). */
  first_seen_at: string;
  /** Last time our crawler saw it live on the company's careers page (job page only). */
  last_seen_at?: string;
  company_id: string;
  company_name: string;
  company_slug: string;
  company_logo_url: string | null;
  company_domain: string | null;
}

export interface CompanyView {
  id: string;
  slug: string;
  name: string;
  domain: string | null;
  logo_url: string | null;
  website_url: string | null;
  industry: string | null;
}

export interface JobFilters {
  q?: string;
  role?: RoleFamily;
  segment?: SalesSegment;
  motion?: SalesMotion;
  remote?: RemoteType;
  /** "US" or "CA". Jobs open in both show up for either. */
  country?: "US" | "CA";
  minBase?: number;
  minOte?: number;
  postedWithinDays?: number;
  companySlug?: string;
}

const CARD_COLUMNS =
  "id, slug, title_raw, role_family, seniority, sales_segment, sales_motion, self_sourcing_level, customer_segment, remote_type, location_raw, city, state, salary_min, salary_max, ote_min, ote_max, summary, disclosures, apply_url, first_seen_at:posted_at, company_id, company_name, company_slug, company_logo_url, company_domain, flags, currency, markets";

function applyFiltersLocal(jobs: JobView[], f: JobFilters): JobView[] {
  const since = f.postedWithinDays ? Date.now() - f.postedWithinDays * 86_400_000 : 0;
  return jobs.filter(
    (j) =>
      (!f.q || `${j.title_raw} ${j.company_name}`.toLowerCase().includes(f.q.toLowerCase())) &&
      (!f.role || j.role_family === f.role) &&
      (!f.segment || j.sales_segment === f.segment) &&
      (!f.motion || j.sales_motion === f.motion) &&
      (!f.remote || j.remote_type === f.remote) &&
      (!f.country || (j.markets ?? ["US"]).includes(f.country)) &&
      (!f.minBase || (j.salary_max ?? j.salary_min ?? 0) >= f.minBase) &&
      (!f.minOte || (j.ote_max ?? j.ote_min ?? 0) >= f.minOte) &&
      (!f.companySlug || j.company_slug === f.companySlug) &&
      (!since || new Date(j.first_seen_at).getTime() >= since),
  );
}

export async function listJobs(f: JobFilters = {}, limit = 60, opts: { withDescription?: boolean } = {}): Promise<JobView[]> {
  return (await listJobsWithTotal(f, limit, opts)).jobs;
}

/** Same as listJobs, plus how many jobs match in total (not just the ones returned). */
export async function listJobsWithTotal(
  f: JobFilters = {},
  limit = 60,
  opts: { withDescription?: boolean; offset?: number } = {},
): Promise<{ jobs: JobView[]; total: number }> {
  const offset = Math.max(0, opts.offset ?? 0);
  if (!isSupabaseConfigured()) {
    const all = applyFiltersLocal(SAMPLE_JOBS, f);
    return { jobs: all.slice(offset, offset + limit), total: all.length };
  }

  const db = await serverClient();
  let q = db
    .from("visible_jobs")
    .select(opts.withDescription ? `${CARD_COLUMNS}, description_raw` : CARD_COLUMNS, { count: "exact" })
    .order("posted_at", { ascending: false })
    .order("id")
    .range(offset, offset + limit - 1);
  if (f.q) q = q.or(`title_raw.ilike.%${f.q.replace(/[%,()]/g, "")}%,company_name.ilike.%${f.q.replace(/[%,()]/g, "")}%`);
  if (f.role) q = q.eq("role_family", f.role);
  if (f.segment) q = q.eq("sales_segment", f.segment);
  if (f.motion) q = q.eq("sales_motion", f.motion);
  if (f.remote) q = q.eq("remote_type", f.remote);
  if (f.country) q = q.contains("markets", [f.country]);
  // Pay filters are in USD; Canadian pay is compared at a conservative USD value.
  if (f.minBase) q = q.gte("salary_max_usd", f.minBase);
  if (f.minOte) q = q.gte("ote_max_usd", f.minOte);
  if (f.companySlug) q = q.eq("company_slug", f.companySlug);
  if (f.postedWithinDays) q = q.gte("posted_at", new Date(Date.now() - f.postedWithinDays * 86_400_000).toISOString());
  const { data, error, count } = await q;
  // Asking for a page past the end is not an error, just an empty page.
  if (error && error.code === "PGRST103") return { jobs: [], total: count ?? 0 };
  if (error) throw error;
  const jobs = (data ?? []) as unknown as JobView[];
  return { jobs, total: count ?? jobs.length };
}

export async function getJob(slug: string): Promise<JobView | null> {
  if (!isSupabaseConfigured()) return SAMPLE_JOBS.find((j) => j.slug === slug) ?? null;
  const db = await serverClient();
  const { data } = await db.from("visible_jobs").select(`${CARD_COLUMNS}, description_raw, last_seen_at`).eq("slug", slug).maybeSingle();
  return (data as unknown as JobView) ?? null;
}

export async function getCompany(slug: string): Promise<{ company: CompanyView; jobs: JobView[]; added7: number; added30: number } | null> {
  let company: CompanyView | null;
  if (!isSupabaseConfigured()) {
    company = SAMPLE_COMPANIES.find((c) => c.slug === slug) ?? null;
  } else {
    const db = await serverClient();
    const { data } = await db.from("companies").select("id, slug, name, domain, logo_url, website_url, industry").eq("slug", slug).maybeSingle();
    company = data as CompanyView | null;
  }
  if (!company) return null;
  const jobs = await listJobs({ companySlug: slug }, 200);
  const ago = (d: number) => Date.now() - d * 86_400_000;
  return {
    company,
    jobs,
    added7: jobs.filter((j) => new Date(j.first_seen_at).getTime() >= ago(7)).length,
    added30: jobs.filter((j) => new Date(j.first_seen_at).getTime() >= ago(30)).length,
  };
}

export type HiringTrend = "ramping" | "steady" | "pulling_back";

export interface CompanyStats {
  open_roles: number;
  new_7d: number;
  new_30d: number;
  new_prev_30d: number;
  closed_30d: number;
  median_days_open: number | null;
  open_roles_30d_ago: number | null;
  trend: HiringTrend;
}

export interface CompanyListItem extends CompanyView, CompanyStats {}

const STATS_COLUMNS = "open_roles, new_7d, new_30d, new_prev_30d, closed_30d, median_days_open, open_roles_30d_ago, trend";

export async function getCompanyStats(companyId: string): Promise<CompanyStats | null> {
  if (!isSupabaseConfigured()) return null;
  const db = await serverClient();
  const { data } = await db.from("company_stats").select(STATS_COLUMNS).eq("company_id", companyId).maybeSingle();
  return (data as CompanyStats | null) ?? null;
}

/** Companies with open sales roles, with hiring velocity. Sorted by the caller. */
export async function listCompanies(): Promise<CompanyListItem[]> {
  if (!isSupabaseConfigured()) {
    const by = new Map<string, CompanyListItem>();
    for (const j of SAMPLE_JOBS) {
      const c = by.get(j.company_slug) ?? {
        id: j.company_id, slug: j.company_slug, name: j.company_name, domain: j.company_domain, logo_url: j.company_logo_url,
        website_url: null, industry: null, open_roles: 0, new_7d: 0, new_30d: 0, new_prev_30d: 0, closed_30d: 0,
        median_days_open: null, open_roles_30d_ago: null, trend: "steady" as HiringTrend,
      };
      c.open_roles++;
      by.set(j.company_slug, c);
    }
    return [...by.values()];
  }
  const db = await serverClient();
  const { data } = await db
    .from("company_stats")
    .select(`${STATS_COLUMNS}, companies!inner(id, slug, name, domain, logo_url, website_url, industry, is_disabled)`)
    .gt("open_roles", 0)
    .eq("companies.is_disabled", false)
    .limit(2000);
  type Row = CompanyStats & { companies: CompanyView };
  return ((data ?? []) as unknown as Row[]).map(({ companies, ...stats }) => ({ ...companies, ...stats }));
}

const TREND_RANK: Record<HiringTrend, number> = { ramping: 0, steady: 1, pulling_back: 2 };
export const byHiringFastest = (a: CompanyListItem, b: CompanyListItem) =>
  TREND_RANK[a.trend] - TREND_RANK[b.trend] || b.new_30d - a.new_30d || b.open_roles - a.open_roles;
export const byMostOpen = (a: CompanyListItem, b: CompanyListItem) => b.open_roles - a.open_roles || b.new_30d - a.new_30d;
export const byPullingBack = (a: CompanyListItem, b: CompanyListItem) =>
  TREND_RANK[b.trend] - TREND_RANK[a.trend] || b.closed_30d - a.closed_30d;

/** Jobs by id, for the saved-jobs list. */
export async function getJobsByIds(ids: string[]): Promise<JobView[]> {
  if (!ids.length) return [];
  if (!isSupabaseConfigured()) return SAMPLE_JOBS.filter((j) => ids.includes(j.id));
  const db = await serverClient();
  const { data } = await db.from("visible_jobs").select(CARD_COLUMNS).in("id", ids);
  return (data ?? []) as unknown as JobView[];
}
