// Workday public career sites ("CXS" JSON API that every *.myworkdayjobs.com site uses).
// List: POST https://{host}/wday/cxs/{tenant}/{site}/jobs  {appliedFacets, limit<=20, offset, searchText}
// Job:  GET  https://{host}/wday/cxs/{tenant}/{site}{externalPath}
//
// ats_identifier is "{host}/{site}", e.g. "salesforce.wd12.myworkdayjobs.com/External_Career_Site".
// Big employers list thousands of jobs, so we (1) narrow to the US with the site's own
// country facet when it has one, (2) keep only sales titles, and (3) fetch details only
// for jobs we haven't stored yet.

import type { Adapter, CompanyRef, FetchOptions, RawJob, RemoteType } from "../types";
import { getJson, postJson } from "../http";
import { htmlToText } from "../html";
import { validDate } from "../dates";
import { classifyTitle } from "../classify";

const PAGE = 20; // Workday's maximum
const MAX_JOBS = 3000; // safety cap per company per crawl

export interface WorkdayBoard {
  host: string;
  tenant: string;
  site: string;
}

export function parseWorkdayId(id: string): WorkdayBoard | null {
  const m = id.match(/^([a-z0-9-]+)\.(wd\d+)\.myworkdayjobs\.com\/([A-Za-z0-9_.-]+)$/i);
  return m ? { host: `${m[1]}.${m[2]}.myworkdayjobs.com`, tenant: m[1]!, site: m[3]! } : null;
}

/** "https://salesforce.wd12.myworkdayjobs.com/en-US/External_Career_Site/job/..." -> "salesforce.wd12.myworkdayjobs.com/External_Career_Site" */
export function workdayIdFromUrl(url: string): string | null {
  const m = url.match(/([a-z0-9-]+\.wd\d+\.myworkdayjobs\.com)\/(?:[a-z]{2}-[A-Z]{2}\/)?([A-Za-z0-9_.-]+)/i);
  if (!m || /^(wday|job|jobs)$/i.test(m[2]!)) return null;
  return `${m[1]!.toLowerCase()}/${m[2]}`;
}

const api = (b: WorkdayBoard) => `https://${b.host}/wday/cxs/${b.tenant}/${b.site}`;

interface WdFacetValue {
  descriptor?: string;
  id?: string;
  facetParameter?: string;
  values?: WdFacetValue[];
}
interface WdFacet {
  facetParameter: string;
  values?: WdFacetValue[];
}
interface WdListing {
  title: string;
  externalPath: string;
  locationsText?: string;
  postedOn?: string;
  bulletFields?: string[];
}
interface WdList {
  total?: number;
  jobPostings?: WdListing[];
  facets?: WdFacet[];
}
interface WdDetail {
  jobPostingInfo?: {
    title?: string;
    jobDescription?: string;
    location?: string;
    additionalLocations?: string[];
    startDate?: string;
    timeType?: string;
    remoteType?: string;
    jobReqId?: string;
    externalUrl?: string;
    country?: { descriptor?: string };
  };
}

/** Find the site's own facet for "United States of America", wherever it's nested. */
export function findUsFacet(facets: WdFacet[] | undefined): { param: string; id: string } | null {
  const walk = (vals: WdFacetValue[] | undefined, param: string): { param: string; id: string } | null => {
    for (const v of vals ?? []) {
      const p = v.facetParameter ?? param;
      if (v.id && /^(united states( of america)?|usa|us)$/i.test((v.descriptor ?? "").trim()) && /country/i.test(p)) return { param: p, id: v.id };
      const deeper = walk(v.values, p);
      if (deeper) return deeper;
    }
    return null;
  };
  for (const f of facets ?? []) {
    const hit = walk(f.values, f.facetParameter);
    if (hit) return hit;
  }
  return null;
}

/** "Posted Today" / "Posted Yesterday" / "Posted 3 Days Ago". "30+ Days Ago" is too vague to use. */
export function parsePostedOn(text: string | undefined, now = Date.now()): string | null {
  if (!text) return null;
  if (/today/i.test(text)) return new Date(now).toISOString();
  if (/yesterday/i.test(text)) return new Date(now - 86_400_000).toISOString();
  const m = text.match(/(\d+)\s+days?\s+ago/i);
  if (m && !/\+/.test(text)) return new Date(now - Number(m[1]) * 86_400_000).toISOString();
  return null;
}

function remoteFrom(s: string | undefined): RemoteType | undefined {
  if (!s) return undefined;
  if (/remote/i.test(s)) return "Remote";
  if (/hybrid|flex/i.test(s)) return "Hybrid";
  if (/on[- ]?site|office/i.test(s)) return "Onsite";
  return undefined;
}

/** Stable id from the posting path, e.g. "/job/NY/Account-Executive_JR12345" -> "JR12345" fallback to the path. */
export function workdayJobId(l: WdListing): string {
  return l.bulletFields?.find((b) => /^[A-Z]{0,4}[-_]?\d{3,}/i.test(b)) ?? l.externalPath.split("/").pop() ?? l.externalPath;
}

export async function listWorkday(board: WorkdayBoard, max = MAX_JOBS): Promise<{ total: number; listings: WdListing[] }> {
  const first = await postJson<WdList>(`${api(board)}/jobs`, { appliedFacets: {}, limit: PAGE, offset: 0, searchText: "" }, { timeoutMs: 25_000 });
  const us = findUsFacet(first.facets);
  const appliedFacets = us ? { [us.param]: [us.id] } : {};
  const head = us ? await postJson<WdList>(`${api(board)}/jobs`, { appliedFacets, limit: PAGE, offset: 0, searchText: "" }, { timeoutMs: 25_000 }) : first;
  const total = Math.min(head.total ?? 0, max);
  const listings = [...(head.jobPostings ?? [])];
  for (let offset = PAGE; offset < total; offset += PAGE) {
    const page = await postJson<WdList>(`${api(board)}/jobs`, { appliedFacets, limit: PAGE, offset, searchText: "" }, { timeoutMs: 25_000 });
    if (!page.jobPostings?.length) break;
    listings.push(...page.jobPostings);
  }
  return { total: head.total ?? listings.length, listings };
}

export const workday: Adapter = {
  provider: "workday",
  async fetchJobs(company: CompanyRef, opts: FetchOptions = {}): Promise<RawJob[]> {
    const board = parseWorkdayId(company.ats_identifier);
    if (!board) throw new Error(`Bad Workday identifier "${company.ats_identifier}"`);
    const { listings } = await listWorkday(board);
    const publicBase = `https://${board.host}/${board.site}`;

    // Sales titles only. The full pipeline re-checks everything; this just saves requests.
    const sales = listings.filter((l) => classifyTitle(l.title));
    const out: RawJob[] = [];
    const queue = [...sales];
    const worker = async () => {
      for (let l = queue.shift(); l; l = queue.shift()) {
        const id = workdayJobId(l);
        const base: RawJob = {
          source_provider: "workday",
          source_job_id: id,
          company: company.name,
          title: l.title.trim(),
          location: l.locationsText ?? "",
          description: "",
          salary_min: null,
          salary_max: null,
          currency: null,
          apply_url: `${publicBase}${l.externalPath}`,
          source_url: `${publicBase}${l.externalPath}`,
          posted_at: parsePostedOn(l.postedOn),
        };
        if (opts.known?.has(id)) {
          // Already stored: just confirm it's still listed. Keep the precise date we saved.
          out.push({ ...base, posted_at: null });
          continue;
        }
        try {
          const d = (await getJson<WdDetail>(`${api(board)}${l.externalPath}`, { timeoutMs: 20_000 })).jobPostingInfo;
          if (!d) continue;
          const locations = [d.location, ...(d.additionalLocations ?? [])].filter(Boolean).join(" / ");
          out.push({
            ...base,
            location: locations || base.location,
            description: htmlToText(d.jobDescription ?? ""),
            apply_url: d.externalUrl ?? base.apply_url,
            source_url: d.externalUrl ?? base.source_url,
            workplace_type: remoteFrom(d.remoteType) ?? remoteFrom(locations),
            employment_type: d.timeType ?? null,
            country_hint: d.country?.descriptor ?? null,
            posted_at: validDate(d.startDate) ?? base.posted_at,
          });
        } catch {
          // One broken posting shouldn't sink the company. It'll be retried next crawl.
        }
      }
    };
    await Promise.all(Array.from({ length: 4 }, worker));
    return out;
  },
};
