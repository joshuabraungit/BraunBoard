// Lever public Postings API
// https://github.com/lever/postings-api
// GET https://api.lever.co/v0/postings/{site}?mode=json

import type { Adapter, CompanyRef, RawJob, RemoteType } from "../types";
import { getJson } from "../http";
import { validDate } from "../dates";

interface LeverPosting {
  id: string;
  text: string;
  hostedUrl: string;
  applyUrl: string;
  workplaceType?: "remote" | "hybrid" | "on-site" | "onsite" | "unspecified";
  country?: string;
  categories?: { location?: string; commitment?: string; team?: string; allLocations?: string[] };
  descriptionPlain?: string;
  lists?: { text: string; content: string }[];
  additionalPlain?: string;
  salaryRange?: { min?: number; max?: number; currency?: string; interval?: string };
  createdAt?: number;
}

const WORKPLACE: Record<string, RemoteType> = {
  remote: "Remote",
  hybrid: "Hybrid",
  "on-site": "Onsite",
  onsite: "Onsite",
};

function listsToText(lists: LeverPosting["lists"]): string {
  return (lists ?? [])
    .map((l) => `${l.text}\n${l.content.replace(/<li>/g, "- ").replace(/<[^>]+>/g, "\n")}`)
    .join("\n\n");
}

export const lever: Adapter = {
  provider: "lever",
  async fetchJobs(company: CompanyRef): Promise<RawJob[]> {
    const site = encodeURIComponent(company.ats_identifier);
    const postings = await getJson<LeverPosting[]>(`https://api.lever.co/v0/postings/${site}?mode=json`);
    return postings.map((p) => {
      const annual = p.salaryRange && /year|annual/i.test(p.salaryRange.interval ?? "");
      return {
        source_provider: "lever",
        source_job_id: p.id,
        company: company.name,
        title: p.text.trim(),
        location: p.categories?.location ?? p.categories?.allLocations?.join(" / ") ?? "",
        description: [p.descriptionPlain, listsToText(p.lists), p.additionalPlain].filter(Boolean).join("\n\n"),
        salary_min: annual ? (p.salaryRange?.min ?? null) : null,
        salary_max: annual ? (p.salaryRange?.max ?? null) : null,
        currency: annual ? (p.salaryRange?.currency ?? null) : null,
        apply_url: p.applyUrl,
        source_url: p.hostedUrl,
        workplace_type: WORKPLACE[p.workplaceType ?? ""] ?? undefined,
        employment_type: p.categories?.commitment ?? null,
        country_hint: p.country ?? null,
        posted_at: validDate(p.createdAt),
      };
    });
  },
};
