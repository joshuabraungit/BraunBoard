// Fictional sample inventory for UI development before Supabase is connected.
// Companies are made up on purpose. Compensation appears only where a
// "posting" would have published it, mirroring the trust rule.

import type { CompanyView, JobView } from "./data";

const h = (hoursAgo: number) => new Date(Date.now() - hoursAgo * 3_600_000).toISOString();

export const SAMPLE_COMPANIES: CompanyView[] = [
  { id: "c1", slug: "northwind", name: "Northwind", domain: null, logo_url: null, website_url: null, industry: "Data" },
  { id: "c2", slug: "ledgerline", name: "Ledgerline", domain: null, logo_url: null, website_url: null, industry: "Fintech" },
  { id: "c3", slug: "quietpeak", name: "Quietpeak", domain: null, logo_url: null, website_url: null, industry: "Security" },
  { id: "c4", slug: "fieldnote", name: "Fieldnote", domain: null, logo_url: null, website_url: null, industry: "Sales Tech" },
  { id: "c5", slug: "brightrail", name: "Brightrail", domain: null, logo_url: null, website_url: null, industry: "Logistics SaaS" },
];

const co = (slug: string) => {
  const c = SAMPLE_COMPANIES.find((x) => x.slug === slug)!;
  return { company_id: c.id, company_name: c.name, company_slug: c.slug, company_logo_url: null, company_domain: null };
};

const base = {
  seniority: "Individual Contributor" as const,
  customer_segment: "Unknown" as const,
  location_raw: null,
  description_raw:
    "This is sample data. Connect Supabase and run the ingester to see real jobs pulled from Greenhouse, Lever and Ashby.",
  apply_url: "#",
  disclosures: {},
};

export const SAMPLE_JOBS: JobView[] = [
  { ...base, ...co("northwind"), id: "j1", slug: "northwind-enterprise-account-executive-1", title_raw: "Enterprise Account Executive", role_family: "Account Executive", sales_segment: "Enterprise", sales_motion: "New Logo", self_sourcing_level: "High", remote_type: "Remote", city: null, state: null, salary_min: 150000, salary_max: 175000, ote_min: 300000, ote_max: 300000, summary: "Sell a data platform to Fortune 1000 data teams. Net-new logos, mostly self-sourced, partnered with an SE.", first_seen_at: h(0.3) },
  { ...base, ...co("ledgerline"), id: "j2", slug: "ledgerline-mid-market-account-executive-2", title_raw: "Mid-Market Account Executive", role_family: "Account Executive", sales_segment: "Mid-Market", sales_motion: "Mixed", self_sourcing_level: "Medium", remote_type: "Hybrid", city: "New York", state: "NY", salary_min: 120000, salary_max: 140000, ote_min: null, ote_max: null, summary: "Close 200–1,000 employee finance teams on spend management. Inbound plus SDR-sourced pipeline.", first_seen_at: h(2) },
  { ...base, ...co("quietpeak"), id: "j3", slug: "quietpeak-strategic-account-executive-3", title_raw: "Strategic Account Executive, Federal", role_family: "Account Executive", sales_segment: "Strategic", sales_motion: "New Logo", self_sourcing_level: "Unknown", remote_type: "Remote", city: null, state: null, salary_min: null, salary_max: null, ote_min: null, ote_max: null, summary: "Land cloud security deals with a short list of named federal agencies.", first_seen_at: h(5) },
  { ...base, ...co("fieldnote"), id: "j4", slug: "fieldnote-sales-development-representative-4", title_raw: "Sales Development Representative", role_family: "SDR/BDR", sales_segment: "Unknown", sales_motion: "New Logo", self_sourcing_level: "High", remote_type: "Onsite", city: "Austin", state: "TX", salary_min: 60000, salary_max: 70000, ote_min: 90000, ote_max: 100000, summary: "Book first meetings with RevOps leaders for the AE team. Outbound-heavy.", first_seen_at: h(20) },
  { ...base, ...co("brightrail"), id: "j5", slug: "brightrail-solutions-engineer-5", title_raw: "Solutions Engineer", role_family: "Sales Engineer", sales_segment: "Enterprise", sales_motion: "Unknown", self_sourcing_level: "Unknown", remote_type: "Remote", city: null, state: null, salary_min: 160000, salary_max: 190000, ote_min: null, ote_max: null, summary: "Run discovery and demos for enterprise shippers alongside two AEs.", first_seen_at: h(30) },
  { ...base, ...co("northwind"), id: "j6", slug: "northwind-account-manager-6", title_raw: "Account Manager, Expansion", role_family: "Customer Expansion", sales_segment: "Mid-Market", sales_motion: "Expansion", self_sourcing_level: "Low", remote_type: "Remote", city: null, state: null, salary_min: null, salary_max: null, ote_min: 220000, ote_max: 240000, summary: "Grow an assigned book of mid-market customers through upsell and renewals.", first_seen_at: h(55) },
  { ...base, ...co("ledgerline"), id: "j7", slug: "ledgerline-director-of-sales-7", title_raw: "Director of Sales, Commercial", role_family: "Sales Director", seniority: "Director", sales_segment: "Unknown", sales_motion: "Unknown", self_sourcing_level: "Unknown", remote_type: "Hybrid", city: "San Francisco", state: "CA", salary_min: 210000, salary_max: 240000, ote_min: 380000, ote_max: 420000, summary: "Lead three AE managers covering commercial accounts in the West.", first_seen_at: h(80) },
];
