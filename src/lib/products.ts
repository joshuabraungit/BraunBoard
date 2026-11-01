// "Browse jobs by product": companies grouped by what they sell, each with its plain-English
// story and its open roles. Loading is cached for 10 minutes; filtering is a pure function.

import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "./supabase/server";
import { SAMPLE_COMPANIES, SAMPLE_JOBS } from "./sample-data";
import { PRODUCT_CATEGORIES, type ProductCategory } from "./ingest/product";
import type { HiringTrend } from "./data";

export { PRODUCT_CATEGORIES };

export interface ProductCompany {
  id: string;
  slug: string;
  name: string;
  domain: string | null;
  logo_url: string | null;
  story: string | null;
  short: string | null;
  quote: string | null;
  category: ProductCategory | null;
  /** False until the AI has read this company's posts at least once. */
  checked: boolean;
  trend: HiringTrend;
  new_30d: number;
  closed_30d: number;
}

export interface ProductJob {
  slug: string;
  title_raw: string;
  role_family: string;
  seniority: string;
  remote_type: string;
  city: string | null;
  state: string | null;
  location_raw: string | null;
  salary_min: number | null;
  salary_max: number | null;
  ote_min: number | null;
  ote_max: number | null;
  currency: string | null;
  markets: string[] | null;
  posted_at: string;
  company_id: string;
}

/** Role groups for the page's role filter. */
export const ROLE_GROUPS = {
  sdr: { label: "SDR", families: ["SDR/BDR"] },
  ae: { label: "AE & AM", families: ["Account Executive", "Account Manager", "Customer Expansion"] },
  se: { label: "Sales Engineer", families: ["Sales Engineer"] },
  lead: { label: "Leadership", families: ["Sales Manager", "Sales Director", "VP Sales", "CRO"] },
} as const;
export type RoleGroup = keyof typeof ROLE_GROUPS;
export const isRoleGroup = (v: unknown): v is RoleGroup => typeof v === "string" && v in ROLE_GROUPS;

export const PRODUCT_SORTS = {
  open: "Most open roles",
  fastest: "Hiring fastest",
  newest: "Newest roles",
  pulling: "Pulling back",
} as const;
export type ProductSort = keyof typeof PRODUCT_SORTS;
export const isProductSort = (v: unknown): v is ProductSort => typeof v === "string" && v in PRODUCT_SORTS;

export const isProductCategory = (v: unknown): v is ProductCategory => PRODUCT_CATEGORIES.includes(v as ProductCategory);

const JOB_COLUMNS =
  "slug, title_raw, role_family, seniority, remote_type, city, state, location_raw, salary_min, salary_max, ote_min, ote_max, currency, markets, posted_at, company_id";

async function load(): Promise<{ companies: ProductCompany[]; jobs: ProductJob[] }> {
  if (!isSupabaseConfigured()) return sampleData();
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const jobs: ProductJob[] = [];
  for (let from = 0; ; from += 1000) {
    // Jobs open 90+ days don't count toward what a company is hiring for here.
    const { data, error } = await db.from("visible_jobs").select(JOB_COLUMNS).gte("posted_at", new Date(Date.now() - 90 * 86_400_000).toISOString()).order("id").range(from, from + 999);
    if (error) throw new Error(`products jobs: ${error.message}`);
    for (const j of (data ?? []) as unknown as ProductJob[]) {
      // location_raw is only shown when there's no city and the role isn't remote.
      jobs.push({ ...j, location_raw: !j.city && j.remote_type !== "Remote" ? (j.location_raw ?? "").slice(0, 60) || null : null });
    }
    if (!data || data.length < 1000) break;
  }
  const { data, error } = await db
    .from("company_stats")
    .select("trend, new_30d, closed_30d, companies!inner(id, slug, name, domain, logo_url, is_disabled, product_story, product_short, product_category, product_checked_at)")
    .gt("open_roles", 0)
    .eq("companies.is_disabled", false)
    .limit(3000);
  if (error) throw new Error(`products companies: ${error.message}`);
  type Row = { trend: HiringTrend; new_30d: number; closed_30d: number; companies: Record<string, unknown> };
  const companies = ((data ?? []) as unknown as Row[]).map(({ companies: c, ...s }) => ({
    id: c.id as string,
    slug: c.slug as string,
    name: c.name as string,
    domain: (c.domain as string) ?? null,
    logo_url: (c.logo_url as string) ?? null,
    story: (c.product_story as string) ?? null,
    short: (c.product_short as string) ?? null,
    // The quote isn't shown on the page; leave it out of the cache.
    quote: null,
    category: isProductCategory(c.product_category) ? c.product_category : null,
    checked: c.product_checked_at != null,
    ...s,
  }));
  return { companies, jobs };
}

export const loadProductData = unstable_cache(load, ["products-v3"], { revalidate: 600, tags: ["products"] });

export interface ProductCard extends ProductCompany {
  open: number;
  newest: string;
  jobs: ProductJob[];
}

export interface ProductQuery {
  category?: ProductCategory;
  role?: RoleGroup;
  q?: string;
  sort?: ProductSort;
  markets?: string[];
}

const TREND_RANK: Record<HiringTrend, number> = { ramping: 0, steady: 1, pulling_back: 2 };

/** Cards for the page: only companies with matching open roles, newest jobs first inside each card. */
export function productCards(data: { companies: ProductCompany[]; jobs: ProductJob[] }, f: ProductQuery = {}): ProductCard[] {
  const families: readonly string[] | null = f.role ? ROLE_GROUPS[f.role].families : null;
  const byCo = new Map<string, ProductJob[]>();
  for (const j of data.jobs) {
    if (families && !families.includes(j.role_family)) continue;
    if (f.markets?.length && !(j.markets ?? []).some((m) => f.markets!.includes(m))) continue;
    byCo.set(j.company_id, [...(byCo.get(j.company_id) ?? []), j]);
  }
  const q = f.q?.trim().toLowerCase();
  const cards = data.companies
    .filter((c) => byCo.has(c.id))
    .filter((c) => !f.category || c.category === f.category)
    .filter((c) => !q || [c.name, c.short, c.story, c.category].some((t) => t?.toLowerCase().includes(q)))
    .map((c) => {
      const jobs = byCo.get(c.id)!.sort((a, b) => b.posted_at.localeCompare(a.posted_at));
      return { ...c, open: jobs.length, newest: jobs[0]!.posted_at, jobs };
    });
  const sort = f.sort ?? "open";
  const cmp: Record<ProductSort, (a: ProductCard, b: ProductCard) => number> = {
    open: (a, b) => b.open - a.open || b.new_30d - a.new_30d,
    fastest: (a, b) => TREND_RANK[a.trend] - TREND_RANK[b.trend] || b.new_30d - a.new_30d || b.open - a.open,
    newest: (a, b) => b.newest.localeCompare(a.newest),
    pulling: (a, b) => TREND_RANK[b.trend] - TREND_RANK[a.trend] || b.closed_30d - a.closed_30d,
  };
  // Companies whose posts never say what they sell go last, whatever the sort.
  return cards.sort((a, b) => Number(!a.story) - Number(!b.story) || cmp[sort](a, b));
}

/** How many companies (with a story) sell each kind of product, for the chips. */
export function categoryCounts(data: { companies: ProductCompany[]; jobs: ProductJob[] }, markets?: string[], role?: RoleGroup): Map<ProductCategory, number> {
  const out = new Map<ProductCategory, number>();
  for (const c of productCards(data, { markets, role })) if (c.category && c.story) out.set(c.category, (out.get(c.category) ?? 0) + 1);
  return out;
}

// Local development only: made-up companies, clearly fictional, so the page can be built without the database.
function sampleData(): { companies: ProductCompany[]; jobs: ProductJob[] } {
  const stories: Record<string, [string, string, ProductCategory]> = {
    northwind: ["Sample: one place for a company's data", "Sample story. Companies keep data in many places, so answers take a long time. This sample product puts it in one place.", "AI & data"],
    ledgerline: ["Sample: company cards that track spending", "Sample story. Finance teams chase receipts every month. This sample product collects them automatically.", "Finance & payments"],
    quietpeak: ["Sample: keeps hackers out of company laptops", "Sample story. One stolen password can open up a whole company. This sample product spots and blocks break-ins.", "Security"],
  };
  const companies = SAMPLE_COMPANIES.map((c) => {
    const s = stories[c.slug];
    return { id: c.id, slug: c.slug, name: c.name, domain: c.domain, logo_url: c.logo_url, short: s?.[0] ?? null, story: s?.[1] ?? null, quote: s ? "Sample data." : null, category: s?.[2] ?? null, checked: true, trend: "steady" as HiringTrend, new_30d: 1, closed_30d: 0 };
  });
  const jobs = SAMPLE_JOBS.map((j) => ({ ...j, posted_at: j.first_seen_at, markets: j.markets ?? ["US"] })) as unknown as ProductJob[];
  return { companies, jobs };
}
