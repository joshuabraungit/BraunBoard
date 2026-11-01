// Workable's public XML job feed.
// https://help.workable.com/hc/en-us/articles/4420464031767 ("Utilizing the XML Job Feed")
// GET https://www.workable.com/boards/workable.xml
//
// Workable publishes this one file for job boards without a Workable integration. It holds every
// approved, published job across all Workable customers, refreshed hourly, with no filters, so we
// download it once per run, keep only sales titles, and hand each company its own jobs.
// Their rules: consume it programmatically, don't poll more often than hourly, and don't alter the
// job URLs (candidates are attributed by them). We use the URLs exactly as given.

import type { Adapter, CompanyRef, RawJob, RemoteType } from "../types";
import { htmlToText, decodeEntities } from "../html";
import { validDate } from "../dates";

export const WORKABLE_FEED_URL = "https://www.workable.com/boards/workable.xml";
const UA = "BraunBoardBot/0.1 (+https://joshbraun.com)";

export interface WorkableFeedJob {
  title: string;
  date: string | null;
  referencenumber: string;
  url: string;
  company: string;
  city: string;
  state: string;
  country: string;
  remote: boolean;
  description: string; // HTML
  jobtype: string;
  website: string;
  /** How we key the company: its website domain (see workableAccount). */
  account: string | null;
}

/** "https://www.Acme.co/careers" -> "acme.co" */
export function normalizeDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  const d = url.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/[/?#].*$/, "");
  return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d) ? d : null;
}

/**
 * Feed job URLs are apply.workable.com/j/{code}, with no account name in them, so a company is
 * keyed by its website domain (every job in the feed has one), falling back to its name.
 */
export function workableAccount(website: string, company: string): string | null {
  const d = normalizeDomain(website);
  if (d) return d;
  const n = company.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return n ? `name:${n}` : null;
}

function field(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}>\\s*(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))\\s*</${name}>`, "i"));
  if (!m) return "";
  return m[1] != null ? m[1].trim() : decodeEntities((m[2] ?? "").trim());
}

export function parseJobBlock(block: string): WorkableFeedJob | null {
  const url = field(block, "url");
  const title = field(block, "title");
  if (!url || !title) return null;
  const company = field(block, "company");
  const website = field(block, "website");
  return {
    title,
    date: field(block, "date") || null,
    referencenumber: field(block, "referencenumber"),
    url,
    company,
    city: field(block, "city"),
    state: field(block, "state"),
    country: field(block, "country"),
    remote: /^true$/i.test(field(block, "remote")),
    description: field(block, "description"),
    jobtype: field(block, "jobtype"),
    website,
    account: workableAccount(website, company),
  };
}

/**
 * Streams the feed and calls `keep` on each job as it's parsed, so the whole file never has to
 * sit in memory. Only jobs `keep` returns true for are collected.
 */
export async function streamWorkableFeed(
  keep: (j: WorkableFeedJob) => boolean,
  opts: { url?: string; timeoutMs?: number } = {},
): Promise<{ jobs: WorkableFeedJob[]; total: number; bytes: number }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 10 * 60_000);
  try {
    const res = await fetch(opts.url ?? WORKABLE_FEED_URL, { headers: { "User-Agent": UA, Accept: "application/xml" }, signal: ctrl.signal });
    if (!res.ok || !res.body) throw new Error(`Workable feed: HTTP ${res.status}`);
    const decoder = new TextDecoder();
    const reader = res.body.getReader();
    let buf = "";
    let total = 0;
    let bytes = 0;
    const jobs: WorkableFeedJob[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (value) {
        bytes += value.byteLength;
        buf += decoder.decode(value, { stream: true });
      }
      let end: number;
      while ((end = buf.indexOf("</job>")) !== -1) {
        const start = buf.lastIndexOf("<job>", end);
        const block = start === -1 ? "" : buf.slice(start, end);
        buf = buf.slice(end + 6);
        if (!block) continue;
        total++;
        const j = parseJobBlock(block);
        if (j && keep(j)) jobs.push(j);
      }
      if (done) break;
    }
    return { jobs, total, bytes };
  } finally {
    clearTimeout(timer);
  }
}

export function toRawJob(j: WorkableFeedJob, companyName: string): RawJob {
  const code = j.url.match(/\/j\/([^/?#]+)/i)?.[1] ?? j.referencenumber;
  const place = [j.city, j.state, j.country].filter(Boolean).join(", ");
  const workplace: RemoteType | undefined = j.remote ? "Remote" : undefined;
  return {
    source_provider: "workable",
    source_job_id: code,
    company: companyName,
    title: j.title.trim(),
    location: j.remote && !place ? "Remote" : j.remote ? `${place} (Remote)` : place,
    description: htmlToText(j.description),
    salary_min: null,
    salary_max: null,
    currency: null,
    apply_url: j.url,
    source_url: j.url,
    workplace_type: workplace,
    employment_type: j.jobtype || null,
    country_hint: j.country || null,
    region_hint: j.state || null,
    city_hint: j.city || null,
    posted_at: validDate(j.date),
  };
}

/** A real feed has tens of thousands of jobs. Far fewer means a cut-off download, not closed jobs. */
export const MIN_FEED_JOBS = 1000;

/**
 * The feed is shared by every Workable company, so one download per process is reused.
 * The ingest run primes it with every account it's about to crawl.
 */
let cache: Promise<Map<string, WorkableFeedJob[]>> | null = null;
const primed = new Set<string>();

export function primeWorkable(accounts: Iterable<string>): Promise<Map<string, WorkableFeedJob[]>> {
  if (!cache) {
    for (const a of accounts) primed.add(a.toLowerCase());
    cache = streamWorkableFeed((j) => !!j.account && primed.has(j.account)).then(({ jobs, total }) => {
      if (total < MIN_FEED_JOBS) throw new Error(`Workable feed looked cut off (${total} jobs)`);
      const by = new Map<string, WorkableFeedJob[]>();
      for (const j of jobs) by.set(j.account!, [...(by.get(j.account!) ?? []), j]);
      return by;
    });
    // A failed download shouldn't stick for the rest of the process.
    cache.catch(() => {
      cache = null;
      primed.clear();
    });
  }
  return cache;
}

export const workable: Adapter = {
  provider: "workable",
  async fetchJobs(company: CompanyRef): Promise<RawJob[]> {
    const account = company.ats_identifier.toLowerCase();
    const by = await primeWorkable([account]);
    // Not in the set the feed was read for: we can't tell "no jobs" from "never looked", so fail
    // the crawl (no strikes) instead of hiding its jobs.
    if (!primed.has(account)) throw new Error(`Workable account ${account} was not in this run's feed read`);
    return (by.get(account) ?? []).map((j) => toRawJob(j, company.name));
  },
};
