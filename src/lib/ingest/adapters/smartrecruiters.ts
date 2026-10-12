// SmartRecruiters public Posting API
// https://developers.smartrecruiters.com/docs/posting-api
// List: GET https://api.smartrecruiters.com/v1/companies/{company}/postings?limit=100&offset=N&country=us
// Job:  GET https://api.smartrecruiters.com/v1/companies/{company}/postings/{id}

import type { Adapter, CompanyRef, FetchOptions, RawJob, RemoteType } from "../types";
import { getJson } from "../http";
import { htmlToText } from "../html";
import { validDate } from "../dates";
import { classifyTitle } from "../classify";

const PAGE = 100;
const MAX_JOBS = 3000;

export interface SrListing {
  id: string;
  name: string;
  releasedDate?: string;
  company?: { identifier?: string; name?: string };
  location?: { city?: string; region?: string; country?: string; remote?: boolean; hybrid?: boolean; fullLocation?: string };
  typeOfEmployment?: { label?: string };
}
interface SrList {
  totalFound?: number;
  content?: SrListing[];
}
interface SrSection {
  title?: string;
  text?: string;
}
interface SrDetail {
  applyUrl?: string;
  postingUrl?: string;
  jobAd?: { sections?: Record<string, SrSection | undefined> };
}

const base = (company: string) => `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(company)}/postings`;

export async function listSmartRecruiters(company: string, { usOnly = true, max = MAX_JOBS } = {}): Promise<{ total: number; listings: SrListing[] }> {
  const listings: SrListing[] = [];
  let total = 0;
  for (let offset = 0; offset < max; offset += PAGE) {
    const page = await getJson<SrList>(`${base(company)}?limit=${PAGE}&offset=${offset}${usOnly ? "&country=us" : ""}`, { timeoutMs: 25_000 });
    total = page.totalFound ?? 0;
    listings.push(...(page.content ?? []));
    if (!page.content?.length || listings.length >= total) break;
  }
  return { total, listings };
}

function workplace(l: SrListing): RemoteType | undefined {
  if (l.location?.remote) return "Remote";
  if (l.location?.hybrid) return "Hybrid";
  return undefined;
}

export const smartrecruiters: Adapter = {
  provider: "smartrecruiters",
  async fetchJobs(company: CompanyRef, opts: FetchOptions = {}): Promise<RawJob[]> {
    const { listings } = await listSmartRecruiters(company.ats_identifier);
    const sales = listings.filter((l) => classifyTitle(l.name));
    const out: RawJob[] = [];
    const queue = [...sales];
    const worker = async () => {
      for (let l = queue.shift(); l; l = queue.shift()) {
        const url = `https://jobs.smartrecruiters.com/${encodeURIComponent(company.ats_identifier)}/${l.id}`;
        const job: RawJob = {
          source_provider: "smartrecruiters",
          source_job_id: l.id,
          company: company.name,
          title: l.name.trim(),
          location: l.location?.fullLocation ?? [l.location?.city, l.location?.region].filter(Boolean).join(", "),
          description: "",
          salary_min: null,
          salary_max: null,
          currency: null,
          apply_url: url,
          source_url: url,
          workplace_type: workplace(l),
          employment_type: l.typeOfEmployment?.label ?? null,
          country_hint: l.location?.country ?? null,
          region_hint: l.location?.region ?? null,
          city_hint: l.location?.city ?? null,
          posted_at: validDate(l.releasedDate),
        };
        if (opts.known?.has(l.id)) {
          out.push(job);
          continue;
        }
        try {
          const d = await getJson<SrDetail>(`${base(company.ats_identifier)}/${l.id}`, { timeoutMs: 20_000 });
          const sections = d.jobAd?.sections ?? {};
          // Company boilerplate last: the role-specific text matters more for extraction.
          const order = ["jobDescription", "qualifications", "additionalInformation", "companyDescription"];
          const description = order
            .map((k) => sections[k])
            .filter((x): x is SrSection => !!x?.text)
            .map((x) => `${x.title ? `${x.title}\n` : ""}${htmlToText(x.text!)}`)
            .join("\n\n");
          out.push({ ...job, description, apply_url: d.applyUrl ?? job.apply_url, source_url: d.postingUrl ?? job.source_url });
        } catch {
          // Retried next crawl.
        }
      }
    };
    await Promise.all(Array.from({ length: 4 }, worker));
    return out;
  },
};
