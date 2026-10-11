// Shared types for the ingestion pipeline. Spec section 6 + 8.

export type AtsProvider = "greenhouse" | "lever" | "ashby";

export const ROLE_FAMILIES = [
  "SDR/BDR",
  "Account Executive",
  "Account Manager",
  "Customer Expansion",
  "Sales Engineer",
  "Sales Manager",
  "Sales Director",
  "VP Sales",
  "CRO",
] as const;
export type RoleFamily = (typeof ROLE_FAMILIES)[number];

export const SENIORITIES = ["Individual Contributor", "Manager", "Director", "Executive", "Unknown"] as const;
export type Seniority = (typeof SENIORITIES)[number];

export const SALES_SEGMENTS = ["SMB", "Mid-Market", "Enterprise", "Strategic", "Unknown"] as const;
export type SalesSegment = (typeof SALES_SEGMENTS)[number];

export const SALES_MOTIONS = ["New Logo", "Expansion", "Mixed", "Channel", "Unknown"] as const;
export type SalesMotion = (typeof SALES_MOTIONS)[number];

export const SELF_SOURCING_LEVELS = ["Low", "Medium", "High", "Unknown"] as const;
export type SelfSourcingLevel = (typeof SELF_SOURCING_LEVELS)[number];

export const REMOTE_TYPES = ["Remote", "Hybrid", "Onsite", "Unknown"] as const;
export type RemoteType = (typeof REMOTE_TYPES)[number];

/** Company record as the pipeline needs it. */
export interface CompanyRef {
  id: string;
  name: string;
  ats_provider: AtsProvider;
  ats_identifier: string;
}

/**
 * Canonical adapter output. Every adapter returns exactly this shape so the
 * rest of the pipeline never knows which ATS a job came from.
 * Compensation fields are only filled when the ATS publishes structured pay.
 */
export interface RawJob {
  source_provider: AtsProvider;
  source_job_id: string;
  company: string;
  title: string;
  location: string;
  description: string; // plain text
  salary_min: number | null;
  salary_max: number | null;
  currency: string | null;
  apply_url: string;
  source_url: string;
  // Optional hints some ATSs give us directly
  workplace_type?: RemoteType;
  employment_type?: string | null;
  country_hint?: string | null;
  region_hint?: string | null;
  city_hint?: string | null;
}

export interface SalesAttributes {
  role_family: RoleFamily;
  seniority: Seniority;
  sales_segment: SalesSegment;
  sales_motion: SalesMotion;
  self_sourcing_level: SelfSourcingLevel;
  customer_segment: SalesSegment;
}

export interface Adapter {
  provider: AtsProvider;
  fetchJobs(company: CompanyRef): Promise<RawJob[]>;
}
