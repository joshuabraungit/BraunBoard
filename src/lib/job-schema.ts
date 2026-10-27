// The hidden label Google reads to show a job in its jobs search box (schema.org JobPosting).
// Everything here comes from the stored posting. Pay is only included when the posting states a base salary,
// because Google's salary field means base pay, and OTE isn't base.

import type { JobView } from "./data";

const COUNTRY: Record<string, { code: string; name: string }> = {
  US: { code: "US", name: "United States" },
  CA: { code: "CA", name: "Canada" },
  UK: { code: "GB", name: "United Kingdom" },
};

/** Google's employment types, from whatever the careers site wrote ("FullTime", "Regular - Full Time"...). */
export function employmentType(raw: string | null | undefined): string | undefined {
  const s = (raw ?? "").toLowerCase();
  if (/contract/.test(s)) return "CONTRACTOR";
  if (/temp/.test(s)) return "TEMPORARY";
  if (/intern/.test(s)) return "INTERN";
  if (/part/.test(s)) return "PART_TIME";
  if (/full/.test(s)) return "FULL_TIME";
  return undefined;
}

/** When the careers site didn't say, the posting text often does ("This is a full-time role"). */
export function employmentTypeFromText(text: string | null | undefined): string | undefined {
  const t = text ?? "";
  if (/\bfull[- ]?time\b/i.test(t)) return "FULL_TIME";
  if (/\bpart[- ]?time (role|position|job)\b/i.test(t)) return "PART_TIME";
  if (/\b(contract|contractor|fixed[- ]term) (role|position|job)\b/i.test(t)) return "CONTRACTOR";
  return undefined;
}

const DAY = 86_400_000;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Plain posting text as simple HTML paragraphs, which is what Google asks for. */
export function postingHtml(text: string): string {
  return text
    .trim()
    .split(/\n\s*\n/)
    .map((p) => `<p>${esc(p.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function jobPostingSchema(job: JobView & { employment_type?: string | null }, siteUrl: string): Record<string, unknown> {
  const markets = job.markets?.length ? job.markets : ["US"];
  const primary = COUNTRY[markets.includes("US") ? "US" : markets.includes("CA") ? "CA" : "UK"] ?? COUNTRY.US;
  const text = job.description_raw?.trim() || job.summary?.trim() || `${job.title_raw} at ${job.company_name}.`;

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: job.title_raw,
    description: postingHtml(text),
    datePosted: new Date(job.first_seen_at).toISOString(),
    // We take a job down as soon as the company does. This only tells Google when to stop trusting
    // the listing if our checks ever stopped: 30 days after we last saw it live.
    validThrough: new Date(new Date(job.last_seen_at ?? Date.now()).getTime() + 30 * DAY).toISOString(),
    url: `${siteUrl}/jobs/${job.slug}`,
    directApply: false,
    identifier: { "@type": "PropertyValue", name: job.company_name, value: job.id },
    hiringOrganization: {
      "@type": "Organization",
      name: job.company_name,
      ...(job.company_domain ? { sameAs: `https://${job.company_domain}` } : {}),
      ...(job.company_logo_url?.startsWith("http") ? { logo: job.company_logo_url } : {}),
    },
  };

  const type = employmentType(job.employment_type) ?? employmentTypeFromText(job.description_raw);
  if (type) schema.employmentType = type;

  if (job.remote_type === "Remote") {
    schema.jobLocationType = "TELECOMMUTE";
    schema.applicantLocationRequirements = markets.map((m) => ({ "@type": "Country", name: (COUNTRY[m] ?? COUNTRY.US).name }));
  } else {
    schema.jobLocation = {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        ...(job.city ? { addressLocality: job.city } : {}),
        ...(job.state ? { addressRegion: job.state } : {}),
        addressCountry: primary.code,
      },
    };
  }

  if (job.salary_min != null) {
    schema.baseSalary = {
      "@type": "MonetaryAmount",
      currency: job.currency || "USD",
      value: {
        "@type": "QuantitativeValue",
        minValue: job.salary_min,
        maxValue: job.salary_max ?? job.salary_min,
        unitText: "YEAR",
      },
    };
  }
  return schema;
}

/** JSON that's safe to drop inside a script tag. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
