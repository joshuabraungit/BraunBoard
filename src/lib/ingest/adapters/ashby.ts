// Ashby public Job Posting API
// https://developers.ashbyhq.com/docs/public-job-posting-api
// GET https://api.ashbyhq.com/posting-api/job-board/{board}?includeCompensation=true

import type { Adapter, CompanyRef, RawJob, RemoteType } from "../types";
import { getJson } from "../http";
import { validDate } from "../dates";

interface AshbyComponent {
  compensationType: string; // "Salary" | "Commission" | "EquityPercentage" | "Bonus" ...
  interval: string; // "1 YEAR" | "NONE" ...
  currencyCode: string | null;
  minValue: number | null;
  maxValue: number | null;
}

interface AshbyJob {
  id: string;
  title: string;
  location: string;
  isListed: boolean;
  isRemote: boolean;
  workplaceType?: "Remote" | "Hybrid" | "OnSite" | null;
  employmentType?: string;
  descriptionPlain?: string;
  jobUrl: string;
  publishedAt?: string;
  applyUrl: string;
  address?: { postalAddress?: { addressCountry?: string; addressRegion?: string; addressLocality?: string } };
  secondaryLocations?: { location: string }[];
  compensation?: {
    compensationTierSummary?: string | null;
    summaryComponents?: AshbyComponent[];
    compensationTiers?: { tierSummary?: string | null; components?: (AshbyComponent & { summary?: string | null })[] }[];
  };
}

function workplace(j: AshbyJob): RemoteType | undefined {
  if (j.workplaceType === "Remote") return "Remote";
  if (j.workplaceType === "Hybrid") return "Hybrid";
  if (j.workplaceType === "OnSite") return "Onsite";
  if (j.isRemote) return "Remote";
  return undefined;
}

export const ashby: Adapter = {
  provider: "ashby",
  async fetchJobs(company: CompanyRef): Promise<RawJob[]> {
    const board = encodeURIComponent(company.ats_identifier);
    const data = await getJson<{ jobs: AshbyJob[] }>(
      `https://api.ashbyhq.com/posting-api/job-board/${board}?includeCompensation=true`,
    );
    return (data.jobs ?? [])
      .filter((j) => j.isListed !== false)
      .map((j) => {
        const salary = j.compensation?.summaryComponents?.find(
          (c) => c.compensationType === "Salary" && c.interval === "1 YEAR",
        );
        // Ashby files OTE under "Salary" but says so in the human-readable summary.
        const labels = [
          j.compensation?.compensationTierSummary,
          ...(j.compensation?.compensationTiers ?? []).flatMap((t) => [t.tierSummary, ...(t.components ?? []).map((c) => c.summary)]),
        ].filter(Boolean).join(" | ");
        const isOte = /\b(OTE|on[- ]target)\b/i.test(labels);
        const addr = j.address?.postalAddress;
        return {
          source_provider: "ashby",
          source_job_id: j.id,
          company: company.name,
          title: j.title.trim(),
          location: [j.location, ...(j.secondaryLocations ?? []).map((s) => s.location)].filter(Boolean).join(" / "),
          description: j.descriptionPlain ?? "",
          salary_min: salary?.minValue ?? null,
          salary_max: salary?.maxValue ?? null,
          currency: salary?.currencyCode ?? null,
          structured_is_ote: isOte,
          apply_url: j.applyUrl,
          source_url: j.jobUrl,
          workplace_type: workplace(j),
          employment_type: j.employmentType ?? null,
          country_hint: addr?.addressCountry ?? null,
          region_hint: addr?.addressRegion ?? null,
          city_hint: addr?.addressLocality ?? null,
          posted_at: validDate(j.publishedAt),
        };
      });
  },
};
