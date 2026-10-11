// Ashby public Job Posting API
// https://developers.ashbyhq.com/docs/public-job-posting-api
// GET https://api.ashbyhq.com/posting-api/job-board/{board}?includeCompensation=true

import type { Adapter, CompanyRef, RawJob, RemoteType } from "../types";
import { getJson } from "../http";

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
  applyUrl: string;
  address?: { postalAddress?: { addressCountry?: string; addressRegion?: string; addressLocality?: string } };
  secondaryLocations?: { location: string }[];
  compensation?: { summaryComponents?: AshbyComponent[] };
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
          apply_url: j.applyUrl,
          source_url: j.jobUrl,
          workplace_type: workplace(j),
          employment_type: j.employmentType ?? null,
          country_hint: addr?.addressCountry ?? null,
          region_hint: addr?.addressRegion ?? null,
          city_hint: addr?.addressLocality ?? null,
        };
      });
  },
};
