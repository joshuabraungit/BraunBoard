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
  apply_url: string;
  first_seen_at: string;
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
  minBase?: number;
  minOte?: number;
  postedWithinDays?: number;
  companySlug?: string;
}

const CARD_COLUMNS =
  "id, slug, title_raw, role_family, seniority, sales_segment, sales_motion, self_sourcing_level, customer_segment, remote_type, location_raw, city, state, salary_min, salary_max, ote_min, ote_max, summary, disclosures, apply_url, first_seen_at, company_id, company_name, company_slug, company_logo_url, company_domain";

function applyFiltersLocal(jobs: JobView[], f: JobFilters): JobView[] {
  const since = f.postedWithinDays ? Date.now() - f.postedWithinDays * 86_400_000 : 0;
  return jobs.filter(
    (j) =>
      (!f.q || `${j.title_raw} ${j.company_name}`.toLowerCase().includes(f.q.toLowerCase())) &&
      (!f.role || j.role_family === f.role) &&
      (!f.segment || j.sales_segment === f.segment) &&
      (!f.motion || j.sales_motion === f.motion) &&
      (!f.remote || j.remote_type === f.remote) &&
      (!f.minBase || (j.salary_max ?? j.salary_min ?? 0) >= f.minBase) &&
      (!f.minOte || (j.ote_max ?? j.ote_min ?? 0) >= f.minOte) &&
      (!f.companySlug || j.company_slug === f.companySlug) &&
      (!since || new Date(j.first_seen_at).getTime() >= since),
  );
}

export async function listJobs(f: JobFilters = {}, limit = 60): Promise<JobView[]> {
  if (!isSupabaseConfigured()) return applyFiltersLocal(SAMPLE_JOBS, f).slice(0, limit);

  const db = await serverClient();
  let q = db.from("visible_jobs").select(CARD_COLUMNS).order("first_seen_at", { ascending: false }).limit(limit);
  if (f.q) q = q.or(`title_raw.ilike.%${f.q.replace(/[%,()]/g, "")}%,company_name.ilike.%${f.q.replace(/[%,()]/g, "")}%`);
  if (f.role) q = q.eq("role_family", f.role);
  if (f.segment) q = q.eq("sales_segment", f.segment);
  if (f.motion) q = q.eq("sales_motion", f.motion);
  if (f.remote) q = q.eq("remote_type", f.remote);
  if (f.minBase) q = q.gte("salary_max", f.minBase);
  if (f.minOte) q = q.gte("ote_max", f.minOte);
  if (f.companySlug) q = q.eq("company_slug", f.companySlug);
  if (f.postedWithinDays) q = q.gte("first_seen_at", new Date(Date.now() - f.postedWithinDays * 86_400_000).toISOString());
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as JobView[];
}

export async function getJob(slug: string): Promise<JobView | null> {
  if (!isSupabaseConfigured()) return SAMPLE_JOBS.find((j) => j.slug === slug) ?? null;
  const db = await serverClient();
  const { data } = await db.from("visible_jobs").select(`${CARD_COLUMNS}, description_raw`).eq("slug", slug).maybeSingle();
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
