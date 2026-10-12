// Salary insights from real posted pay ranges. Pure functions, no database here.
// Method: each posting contributes the midpoint of its published range. We report
// medians and the middle 50% (25th to 75th percentile). Nothing is estimated.

import type { RemoteType, RoleFamily, SalesSegment } from "./ingest/types";

export interface PayRow {
  slug: string;
  title_raw: string;
  role_family: RoleFamily;
  sales_segment: SalesSegment;
  remote_type: RemoteType;
  city: string | null;
  state: string | null;
  salary_min: number | null;
  salary_max: number | null;
  ote_min: number | null;
  ote_max: number | null;
  company_name: string;
  company_slug: string;
  posted_at: string;
}

/** Fewer postings than this and we don't publish a number. */
export const MIN_SAMPLE = 5;

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

export interface SalaryPage {
  slug: string;
  role: RoleFamily;
  segment: SalesSegment | null;
  /** "Enterprise AEs" */
  plural: string;
  /** "Enterprise Account Executive" */
  title: string;
}

const ROLE_SLUGS: Partial<Record<RoleFamily, { slug: string; short: string; plural: string }>> = {
  "Account Executive": { slug: "account-executive", short: "AE", plural: "AEs" },
  "SDR/BDR": { slug: "sdr-bdr", short: "SDR", plural: "SDRs and BDRs" },
  "Sales Engineer": { slug: "sales-engineer", short: "SE", plural: "Sales Engineers" },
  "Account Manager": { slug: "account-manager", short: "AM", plural: "Account Managers" },
  "Sales Manager": { slug: "sales-manager", short: "Sales Manager", plural: "Sales Managers" },
  "Sales Director": { slug: "sales-director", short: "Sales Director", plural: "Sales Directors" },
  "VP Sales": { slug: "vp-sales", short: "VP of Sales", plural: "VPs of Sales" },
};
const SEGMENT_SLUGS: Partial<Record<SalesSegment, string>> = {
  SMB: "smb",
  "Mid-Market": "mid-market",
  Enterprise: "enterprise",
  Strategic: "strategic",
};

export const SALARY_ROLES = Object.keys(ROLE_SLUGS) as RoleFamily[];
export const SALARY_SEGMENTS = Object.keys(SEGMENT_SLUGS) as SalesSegment[];

/** Every page we could publish. Whether it has enough data is decided at render. */
export function allSalaryPages(): SalaryPage[] {
  const out: SalaryPage[] = [];
  for (const role of SALARY_ROLES) {
    const r = ROLE_SLUGS[role]!;
    out.push({ slug: r.slug, role, segment: null, plural: r.plural, title: role });
    for (const segment of SALARY_SEGMENTS) {
      // Segment pages only for the roles where segment really changes the job.
      if (!["Account Executive", "SDR/BDR", "Sales Engineer", "Account Manager"].includes(role)) continue;
      out.push({
        slug: `${SEGMENT_SLUGS[segment]}-${r.slug}`,
        role,
        segment,
        plural: `${segment} ${r.plural}`,
        title: `${segment} ${role}`,
      });
    }
  }
  return out;
}

export const findSalaryPage = (slug: string) => allSalaryPages().find((p) => p.slug === slug) ?? null;

export const rowsFor = (rows: PayRow[], p: Pick<SalaryPage, "role" | "segment">) =>
  rows.filter((r) => r.role_family === p.role && (p.segment == null || r.sales_segment === p.segment));

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

const mid = (a: number, b: number | null) => (b == null ? a : (a + b) / 2);
export const baseMid = (r: PayRow) => (r.salary_min == null ? null : mid(r.salary_min, r.salary_max));
export const oteMid = (r: PayRow) => (r.ote_min == null ? null : mid(r.ote_min, r.ote_max));

export function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return NaN;
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (i - lo);
}

export interface Dist {
  n: number;
  median: number;
  p25: number;
  p75: number;
}

export function dist(values: (number | null)[]): Dist | null {
  const v = values.filter((x): x is number => x != null).sort((a, b) => a - b);
  if (v.length < MIN_SAMPLE) return null;
  return { n: v.length, median: percentile(v, 0.5), p25: percentile(v, 0.25), p75: percentile(v, 0.75) };
}

export interface SalaryStats {
  postings: number;
  withPay: number;
  base: Dist | null;
  ote: Dist | null;
  /** Median share of OTE that is base, among postings that list both. */
  basePct: number | null;
  splitN: number;
  byWorkplace: { label: string; ote: Dist | null; base: Dist | null }[];
  topCompanies: { name: string; slug: string; ote: number; n: number }[];
  /** OTE midpoints bucketed in $25K steps, for a histogram. */
  histogram: { from: number; to: number; count: number }[];
}

export function salaryStats(rows: PayRow[], allPostings: number): SalaryStats {
  const withPay = rows.filter((r) => r.salary_min != null || r.ote_min != null);
  const splits = withPay
    .filter((r) => r.salary_min != null && r.ote_min != null && oteMid(r)! >= baseMid(r)!)
    .map((r) => baseMid(r)! / oteMid(r)!)
    .sort((a, b) => a - b);

  const workplaces: [string, (r: PayRow) => boolean][] = [
    ["Remote", (r) => r.remote_type === "Remote"],
    ["Hybrid or in office", (r) => r.remote_type === "Hybrid" || r.remote_type === "Onsite"],
  ];

  const byCompany = new Map<string, { name: string; slug: string; vals: number[] }>();
  for (const r of withPay) {
    const o = oteMid(r);
    if (o == null) continue;
    const c = byCompany.get(r.company_slug) ?? { name: r.company_name, slug: r.company_slug, vals: [] };
    c.vals.push(o);
    byCompany.set(r.company_slug, c);
  }
  const topCompanies = [...byCompany.values()]
    .map((c) => ({ name: c.name, slug: c.slug, n: c.vals.length, ote: percentile([...c.vals].sort((a, b) => a - b), 0.5) }))
    .sort((a, b) => b.ote - a.ote)
    .slice(0, 10);

  const otes = withPay.map(oteMid).filter((x): x is number => x != null);
  const STEP = 25_000;
  const histogram: SalaryStats["histogram"] = [];
  if (otes.length >= MIN_SAMPLE) {
    const sorted = [...otes].sort((a, b) => a - b);
    // Trim the extreme 2% on each side so one outlier doesn't stretch the chart.
    const lo = Math.floor(percentile(sorted, 0.02) / STEP) * STEP;
    const hi = Math.ceil(percentile(sorted, 0.98) / STEP) * STEP;
    const top = Math.max(hi, lo + STEP);
    for (let from = lo; from < top; from += STEP) histogram.push({ from, to: from + STEP, count: 0 });
    // Outliers land in the end buckets rather than disappearing.
    for (const o of otes) {
      const i = Math.min(histogram.length - 1, Math.max(0, Math.floor((o - lo) / STEP)));
      histogram[i]!.count++;
    }
  }

  return {
    postings: allPostings,
    withPay: withPay.length,
    base: dist(withPay.map(baseMid)),
    ote: dist(withPay.map(oteMid)),
    basePct: splits.length >= MIN_SAMPLE ? Math.round(percentile(splits, 0.5) * 100) : null,
    splitN: splits.length,
    byWorkplace: workplaces.map(([label, f]) => {
      const sub = withPay.filter(f);
      return { label, ote: dist(sub.map(oteMid)), base: dist(sub.map(baseMid)) };
    }),
    topCompanies,
    histogram,
  };
}

/** Round to the nearest $1K and format like "$275K". */
export function k(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2).replace(/0$/, "")}M`;
  return `$${Math.round(n / 1000)}K`;
}
