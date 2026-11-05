// Industries a job seeker can pick (or a résumé can fill in), in plain English.
// A job is in an industry if the company is in that sector (Fintech, Security...)
// or the customers it sells to are (a bank, a hospital, a restaurant).
// When a watch picks industries, jobs outside them don't show. Jobs we can't place
// in any industry don't show either, so "fintech" means fintech.

export const INDUSTRIES = {
  fintech: {
    label: "Fintech & finance",
    sectors: ["Fintech", "Payments", "Banking Software", "Identity Verification"],
    words: /\b(fintech|financ|bank|payment|lending|lender|credit union|wealth|insur|accounting|accountant|tax|mortgage|invest|capital market|trading)/,
  },
  healthcare: {
    label: "Healthcare & life sciences",
    sectors: ["Health IT", "Medical Devices"],
    words: /\b(health|hospitals?\b|medical|clinic|life science|pharma|biotech|patient|dental|physician)/,
  },
  security: {
    label: "Cybersecurity",
    sectors: ["Security", "Identity Verification", "Data Backup"],
    words: /\b(cyber|security|identity)/,
  },
  data_ai: {
    label: "Data & AI",
    sectors: ["Data & AI", "Data", "Analytics", "Data Backup"],
    words: /\b(artificial intelligence|\bai\b|machine learning|data team|analytics)/,
  },
  devtools: {
    label: "Dev tools & infrastructure",
    sectors: ["DevTools & Infra", "Developer Tools", "Infrastructure", "Observability", "IoT", "Networking", "IT Services"],
    words: /\b(developer|engineering team|devops|cloud infra|it team|it leader|networking)/,
  },
  martech: {
    label: "Marketing & advertising",
    sectors: ["Marketing Tech"],
    words: /\b(marketing|advertis|agenc|media|publisher)/,
  },
  salestech: {
    label: "Sales & customer tech",
    sectors: ["Sales Tech", "Customer Service Software", "Communications"],
    words: /\b(sales team|revenue team|customer support|contact center|call center)/,
  },
  hr: {
    label: "HR & work tech",
    // "Productivity & Collab" is a mixed bag (Klaviyo, Five9, Zapier...), so those lean on who they sell to.
    sectors: ["HR & Work", "HR Tech", "HR Software", "Productivity", "Design"],
    words: /\b(hr |human resource|recruit|talent|payroll|people team)/,
  },
  retail: {
    label: "Restaurants, retail & hospitality",
    sectors: [],
    words: /\b(restaurant|retail|food|beverage|hospitality|hotel|ecommerce|e-commerce|grocer|consumer|golf|travel)/,
  },
  government: {
    label: "Government & education",
    sectors: ["EdTech"],
    words: /\b(government|public sector|federal|state and local|municipal|k-12|school|higher education|universit|education)/,
  },
  industrial: {
    label: "Manufacturing, construction & logistics",
    sectors: ["IoT"],
    words: /\b(manufactur|construction|logistic|supply chain|field service|transportation|trucking|automotive|aerospace|defense|industrial|home service|building|energy|utilit|agricultur)/,
  },
  real_estate_legal: {
    label: "Real estate, legal & professional services",
    sectors: [],
    words: /\b(real estate|propert|legal|law firm|attorney|professional services|consult)/,
  },
} as const satisfies Record<string, { label: string; sectors: readonly string[]; words: RegExp }>;

export type Industry = keyof typeof INDUSTRIES;
export const INDUSTRY_KEYS = Object.keys(INDUSTRIES) as Industry[];
export const isIndustry = (v: unknown): v is Industry => typeof v === "string" && v in INDUSTRIES;

export interface IndustryJob {
  /** The company's sector, like "Fintech" or "Security". */
  company_sector?: string | null;
  /** The customers' industry, as the posting states it. */
  industry?: string | null;
  buyer?: string | null;
}

/** Every industry this job belongs to. */
export function jobIndustries(job: IndustryJob): Industry[] {
  const sector = job.company_sector ?? "";
  // The buyer line is often a job title ("operations and finance leaders"), not an industry,
  // so it's only a last resort when there's no sector or customer industry to go on.
  const text = (job.industry?.trim() || (sector ? "" : job.buyer) || "").toLowerCase();
  return INDUSTRY_KEYS.filter((k) => {
    const def = INDUSTRIES[k];
    return (def.sectors as readonly string[]).includes(sector) || (text.trim() !== "" && def.words.test(text));
  });
}

/** Is the job in one of the industries they picked? No pick means any industry. */
export function fitsIndustry(job: IndustryJob, prefs: { industries?: string[] }): boolean {
  if (!prefs.industries?.length) return true;
  return jobIndustries(job).some((i) => prefs.industries!.includes(i));
}
