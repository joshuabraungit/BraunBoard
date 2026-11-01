// Transparent match scoring. Spec section 12.
// Based only on the user's stated preferences, never on whether the company is "good".
// Unknown job values are neutral: they're shown as "?" and left out of the
// denominator instead of counting against the role.

import type { RemoteType, RoleFamily, SalesMotion, SalesSegment, SelfSourcingLevel } from "./ingest/types";
import { toUsdRate } from "./ingest/compensation";
import type { SizeBucket } from "./ingest/size";

export interface WatchPrefs {
  role_families: RoleFamily[];
  segments: SalesSegment[];
  motions: SalesMotion[];
  remote_types: RemoteType[];
  locations: string[]; // state codes or city names; empty = anywhere
  keywords: string[];
  min_base: number | null;
  min_ote: number | null;
  dealbreakers: Dealbreaker[];
  /** Where the person can work. Missing = US (every watch made before Canada and UK support). */
  countries?: ("US" | "CA" | "UK" | "DE")[];
  /** Company sizes they want ("startup", "growth", "large", "enterprise"). Empty or missing = any size. */
  company_sizes?: SizeBucket[];
  /** Words for who they've sold to, like ["restaurant", "logistic"]. Only ever boosts a match. */
  experience?: string[];
}

// Role words say nothing about the market ("operations leaders" vs "finance leaders"), so they never match.
const GENERIC = new Set(
  "and the with from into for other various including like their them who sold selling sell to of in at a an b2b saas software technology tech leader team owner manager executive director head buyer decision maker company business enterprise small medium large mid market midmarket organization people customer client professional user department firm industry vp".split(" "),
);

/** "Restaurant owners; logistics" -> ["restaurant", "logistic"] */
export function experienceTerms(text: string): string[] {
  const words = text
    .toLowerCase()
    .split(/[^a-z]+/)
    .map((w) => (w.length > 4 && w.endsWith("s") ? w.slice(0, -1) : w))
    .filter((w) => w.length >= 3 && !GENERIC.has(w));
  return [...new Set(words)].slice(0, 20);
}

/** Does the job sell to the same buyers or industries the rep has? */
export function sharesExperience(job: { buyer?: string | null; industry?: string | null }, terms: string[] | undefined): boolean {
  if (!terms?.length) return false;
  const jobTerms = experienceTerms(`${job.buyer ?? ""} ${job.industry ?? ""}`);
  return jobTerms.some((t) => terms.includes(t));
}

export const DEALBREAKERS = [
  "heavy_outbound",
  "early_stage",
  "office_required",
  "no_salary_listed",
  "commission_only",
  "smb",
  "greenfield_territory",
] as const;
export type Dealbreaker = (typeof DEALBREAKERS)[number];

export const DEALBREAKER_LABELS: Record<Dealbreaker, string> = {
  heavy_outbound: "Heavy outbound",
  early_stage: "Early-stage startups",
  office_required: "Office required",
  no_salary_listed: "No salary listed",
  commission_only: "Commission only",
  smb: "SMB",
  greenfield_territory: "Greenfield territory",
};

export interface MatchableJob {
  title_raw: string;
  role_family: RoleFamily;
  sales_segment: SalesSegment;
  sales_motion: SalesMotion;
  self_sourcing_level: SelfSourcingLevel;
  remote_type: RemoteType;
  city: string | null;
  state: string | null;
  salary_min: number | null;
  salary_max: number | null;
  ote_min: number | null;
  ote_max: number | null;
  description_raw: string | null;
  company_employee_range?: string | null;
  /** Size bucket of the company, when known. */
  company_size?: string | null;
  currency?: string | null;
  markets?: string[] | null;
  /** Who the job sells to and in what industry, when we know. */
  buyer?: string | null;
  industry?: string | null;
  /**
   * Text checks already run in the database (see job_text_hits), so the full
   * description doesn't have to be downloaded. When set, these win over description_raw.
   */
  text_hits?: TextHits;
}

export interface TextHits {
  commission_only: boolean;
  greenfield: boolean;
  keyword: boolean;
}

/** Is the job open where this person can work? */
export function openInCountries(job: { markets?: string[] | null }, prefs: Pick<WatchPrefs, "countries">): boolean {
  const want = prefs.countries?.length ? prefs.countries : ["US"];
  return (job.markets?.length ? job.markets : ["US"]).some((m) => (want as string[]).includes(m));
}

/**
 * Is the company a size they want? A company we don't know the size of still passes,
 * so nobody misses a job because we couldn't size the company.
 */
export function fitsSize(job: { company_size?: string | null }, prefs: Pick<WatchPrefs, "company_sizes">): boolean {
  if (!prefs.company_sizes?.length || !job.company_size) return true;
  return (prefs.company_sizes as string[]).includes(job.company_size);
}

export type CheckResult = "pass" | "fail" | "unknown";
export interface MatchCheck {
  key: "role" | "compensation" | "remote" | "location" | "segment" | "motion" | "keyword" | "experience";
  label: string;
  result: CheckResult;
}
export interface MatchResult {
  score: number | null; // 0..100, null when blocked by a dealbreaker
  checks: MatchCheck[];
  blocked_by: Dealbreaker | null;
}

const WEIGHTS: Record<MatchCheck["key"], number> = {
  role: 30,
  compensation: 25,
  remote: 15,
  location: 10,
  segment: 12,
  motion: 8,
  keyword: 10,
  experience: 10,
};

const SMALL_COMPANY = /^(1-10|2-10|11-50|1-50)$/;

function dealbreakerHit(job: MatchableJob, d: Dealbreaker): boolean {
  const text = (job.description_raw ?? "").toLowerCase();
  switch (d) {
    case "heavy_outbound":
      return job.self_sourcing_level === "High";
    case "early_stage":
      return !!job.company_employee_range && SMALL_COMPANY.test(job.company_employee_range);
    case "office_required":
      return job.remote_type === "Onsite";
    case "no_salary_listed":
      return job.salary_min == null && job.ote_min == null;
    case "commission_only":
      if (job.text_hits) return job.text_hits.commission_only;
      return /\b(commission[- ]only|100% commission|straight commission)\b/.test(text);
    case "smb":
      return job.sales_segment === "SMB";
    case "greenfield_territory":
      if (job.text_hits) return job.text_hits.greenfield;
      return /\bgreenfield\b|build (the|a|your) territory from (scratch|the ground up)/.test(text);
  }
}

export function scoreMatch(job: MatchableJob, prefs: WatchPrefs): MatchResult {
  const blocked = prefs.dealbreakers.find((d) => dealbreakerHit(job, d)) ?? null;
  const checks: MatchCheck[] = [];

  if (prefs.role_families.length) {
    checks.push({ key: "role", label: "Role", result: prefs.role_families.includes(job.role_family) ? "pass" : "fail" });
  }

  if (prefs.min_base != null || prefs.min_ote != null) {
    // Compare against the top of the published range: if the job *can* pay what you want, it passes.
    // Minimums are in USD; Canadian pay is compared at a conservative USD value.
    const fx = toUsdRate(job.currency);
    const top = (v: number | null) => (v == null ? null : Math.round(v * fx));
    const baseTop = top(job.salary_max ?? job.salary_min);
    const oteTop = top(job.ote_max ?? job.ote_min);
    const parts: CheckResult[] = [];
    if (prefs.min_base != null) parts.push(baseTop == null ? "unknown" : baseTop >= prefs.min_base ? "pass" : "fail");
    if (prefs.min_ote != null) parts.push(oteTop == null ? "unknown" : oteTop >= prefs.min_ote ? "pass" : "fail");
    const result: CheckResult = parts.includes("fail") ? "fail" : parts.includes("pass") ? "pass" : "unknown";
    checks.push({ key: "compensation", label: "Compensation", result });
  }

  if (prefs.remote_types.length) {
    checks.push({
      key: "remote",
      label: "Remote",
      result: job.remote_type === "Unknown" ? "unknown" : prefs.remote_types.includes(job.remote_type) ? "pass" : "fail",
    });
  }

  if (prefs.locations.length && job.remote_type !== "Remote") {
    const want = prefs.locations.map((l) => l.toLowerCase());
    const has = [job.state, job.city].filter(Boolean).map((s) => s!.toLowerCase());
    checks.push({
      key: "location",
      label: "Location",
      result: !has.length ? "unknown" : has.some((h) => want.includes(h)) ? "pass" : "fail",
    });
  }

  if (prefs.segments.length) {
    checks.push({
      key: "segment",
      label: "Segment",
      result: job.sales_segment === "Unknown" ? "unknown" : prefs.segments.includes(job.sales_segment) ? "pass" : "fail",
    });
  }

  if (prefs.motions.length) {
    // Channel comes from the title, so it's a yes/no: a partnerships watch never gets Mixed or Unknown roles.
    const onlyChannel = prefs.motions.every((m) => m === "Channel");
    const ok = prefs.motions.includes(job.sales_motion) || (job.sales_motion === "Mixed" && !onlyChannel);
    checks.push({
      key: "motion",
      label: onlyChannel ? "Partnerships" : "Motion",
      result: job.sales_motion === "Unknown" && !onlyChannel ? "unknown" : ok ? "pass" : "fail",
    });
  }

  if (prefs.keywords.length) {
    const hay = `${job.title_raw} ${job.description_raw ?? ""}`.toLowerCase();
    checks.push({
      key: "keyword",
      label: "Keyword",
      result: (job.text_hits ? job.text_hits.keyword : prefs.keywords.some((k) => hay.includes(k.toLowerCase()))) ? "pass" : "fail",
    });
  }

  // Selling to buyers they already know is a plus. Not matching is never held against a job.
  if (sharesExperience(job, prefs.experience)) checks.push({ key: "experience", label: "Your buyers", result: "pass" });

  if (blocked) return { score: null, checks, blocked_by: blocked };

  const evaluated = checks.filter((c) => c.result !== "unknown");
  const total = evaluated.reduce((s, c) => s + WEIGHTS[c.key], 0);
  const earned = evaluated.filter((c) => c.result === "pass").reduce((s, c) => s + WEIGHTS[c.key], 0);
  // Nothing known yet: neutral, not zero. Shade it down a bit so confirmed matches rank higher.
  const score = total === 0 ? 70 : Math.round((earned / total) * 100 - checks.filter((c) => c.result === "unknown").length * 2);
  return { score: Math.max(0, Math.min(100, score)), checks, blocked_by: null };
}

/** Alerts only fire above this. Role mismatches never alert. */
export const ALERT_THRESHOLD = 75;
export function shouldAlert(m: MatchResult): boolean {
  if (m.score == null) return false;
  if (m.checks.some((c) => c.key === "role" && c.result === "fail")) return false;
  return m.score >= ALERT_THRESHOLD;
}
