// ATS detection. Given a careers URL (best) or just a company name/domain,
// figure out which supported ATS hosts the company's public job board.

import type { AtsProvider } from "./types";
import { getJson, HttpError, postJson } from "./http";
import { listWorkday, parseWorkdayId, workdayIdFromUrl } from "./adapters/workday";
import { listSmartRecruiters } from "./adapters/smartrecruiters";

export interface Detected {
  provider: AtsProvider;
  identifier: string;
}

const URL_PATTERNS: { provider: AtsProvider; re: RegExp }[] = [
  { provider: "greenhouse", re: /(?:boards|job-boards)(?:\.eu)?\.greenhouse\.io\/(?:embed\/job_board\?for=)?([a-z0-9_-]+)/i },
  { provider: "greenhouse", re: /boards-api\.greenhouse\.io\/v1\/boards\/([a-z0-9_-]+)/i },
  { provider: "lever", re: /jobs\.(?:eu\.)?lever\.co\/([a-z0-9_.-]+)/i },
  { provider: "ashby", re: /jobs\.ashbyhq\.com\/([a-z0-9_.%-]+)/i },
  { provider: "workable", re: /apply\.workable\.com\/([a-z0-9_-]+)/i },
  { provider: "smartrecruiters", re: /(?:jobs|careers)\.smartrecruiters\.com\/([A-Za-z0-9_.-]+)/i },
  { provider: "smartrecruiters", re: /api\.smartrecruiters\.com\/v1\/companies\/([A-Za-z0-9_.-]+)/i },
];

/** Pure URL sniffing, no network. */
export function detectFromUrl(url: string): Detected | null {
  const wd = workdayIdFromUrl(url);
  if (wd) return { provider: "workday", identifier: wd };
  for (const { provider, re } of URL_PATTERNS) {
    const m = url.match(re);
    if (m) return { provider, identifier: decodeURIComponent(m[1]) };
  }
  return null;
}

/** Board-token guesses from a company name or domain: "Acme Corp" / acme.com -> acme, acmecorp, acme-corp */
export function candidateTokens(...namesOrDomains: (string | null | undefined)[]): string[] {
  const out: string[] = [];
  for (const raw of namesOrDomains) {
    if (!raw) continue;
    const base = raw
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\.(com|io|ai|co|net|org|app|dev|so|tech|us|xyz|cloud|inc)(\/.*)?$/, "")
      .replace(/\b(inc|llc|ltd|corp|corporation|co|technologies|technology|labs|hq)\b\.?/g, "")
      .trim();
    const words = base.split(/[^a-z0-9]+/).filter(Boolean);
    if (!words.length) continue;
    out.push(words.join(""), words.join("-"), words[0], words.join("") + "hq");
  }
  return [...new Set(out.filter(Boolean))];
}

// ---------------------------------------------------------------------------
// Verification: a guessed board token might belong to a different company with
// the same name (Apollo.io vs Apollo GraphQL). Only trust a guess we can confirm.
// ---------------------------------------------------------------------------

const SUFFIXES = /\b(inc|llc|ltd|corp|corporation|co|company|technologies|technology|labs|hq|careers|jobs|io|ai|app|software|group|the)\b/g;

export function normalizeCompanyName(n: string): string {
  return n
    .toLowerCase()
    .replace(/\.(com|io|ai|co|so|app|dev)\b/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(SUFFIXES, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function namesMatch(a: string, b: string): boolean {
  const x = normalizeCompanyName(a);
  const y = normalizeCompanyName(b);
  return !!x && x === y;
}

/** Postings mention the company: domain once, or the exact capitalized name 3+ times. */
export function textMentionsCompany(texts: string[], name: string, domain: string | null): boolean {
  const all = texts.join("\n");
  if (domain && all.toLowerCase().includes(domain.toLowerCase().replace(/^www\./, ""))) return true;
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const hits = all.match(new RegExp(`(^|[^A-Za-z])${esc}(?![A-Za-z])`, "g"))?.length ?? 0;
  return hits >= 3;
}

type Probe = { found: boolean; verified: boolean };

async function probe(provider: AtsProvider, token: string, name: string, domain: string | null): Promise<Probe> {
  const t = encodeURIComponent(token);
  try {
    if (provider === "greenhouse") {
      const board = await getJson<{ name?: string }>(`https://boards-api.greenhouse.io/v1/boards/${t}`, { retries: 0, timeoutMs: 10_000 });
      if (board.name && namesMatch(board.name, name)) return { found: true, verified: true };
      const jobs = await getJson<{ jobs: { content?: string }[] }>(`https://boards-api.greenhouse.io/v1/boards/${t}/jobs?content=true`, { retries: 0, timeoutMs: 20_000 });
      const texts = (jobs.jobs ?? []).slice(0, 25).map((j) => j.content ?? "");
      return { found: true, verified: textMentionsCompany(texts, name, domain) };
    }
    if (provider === "lever") {
      const posts = await getJson<{ descriptionPlain?: string; additionalPlain?: string }[]>(`https://api.lever.co/v0/postings/${t}?mode=json&limit=25`, { retries: 0, timeoutMs: 15_000 });
      if (!Array.isArray(posts) || !posts.length) return { found: false, verified: false };
      return { found: true, verified: textMentionsCompany(posts.map((p) => `${p.descriptionPlain ?? ""}\n${p.additionalPlain ?? ""}`), name, domain) };
    }
    const board = await getJson<{ jobs?: { descriptionPlain?: string }[] }>(`https://api.ashbyhq.com/posting-api/job-board/${t}`, { retries: 0, timeoutMs: 20_000 });
    const texts = (board.jobs ?? []).slice(0, 25).map((j) => j.descriptionPlain ?? "");
    return { found: true, verified: textMentionsCompany(texts, name, domain) };
  } catch (err) {
    // 404/401/etc means "no board here". Timeouts and network blips: treat as not found
    // rather than aborting the whole seed run.
    if (err instanceof HttpError) return { found: false, verified: false };
    return { found: false, verified: false };
  }
}

export interface ProbeResult extends Detected {
  verified: boolean;
}

/**
 * Probe the public APIs with guessed tokens. Returns the first VERIFIED board.
 * If boards were found but none could be verified, returns the first one with verified=false
 * so the caller can log it; callers should not crawl unverified boards.
 */
export async function detectByProbing(name: string, domain: string | null = null): Promise<ProbeResult | null> {
  let firstUnverified: ProbeResult | null = null;
  for (const token of candidateTokens(name, domain)) {
    for (const provider of ["greenhouse", "ashby", "lever"] as AtsProvider[]) {
      const p = await probe(provider, token, name, domain);
      if (p.found && p.verified) return { provider, identifier: token, verified: true };
      if (p.found && !firstUnverified) firstUnverified = { provider, identifier: token, verified: false };
    }
  }
  return firstUnverified;
}

// ---------------------------------------------------------------------------
// Workday and SmartRecruiters: verify a pinned board actually lists jobs and
// (for SmartRecruiters, where identifiers are shared names) belongs to the company.
// ---------------------------------------------------------------------------

export interface BoardCheck {
  ok: boolean;
  total: number;
  reason?: string;
}

export async function verifyBoard(d: Detected, name: string): Promise<BoardCheck> {
  try {
    if (d.provider === "workday") {
      const b = parseWorkdayId(d.identifier);
      if (!b) return { ok: false, total: 0, reason: "bad Workday URL" };
      const { total } = await listWorkday(b, 20);
      return total > 0 ? { ok: true, total } : { ok: false, total, reason: "board lists no US jobs" };
    }
    if (d.provider === "smartrecruiters") {
      const { total, listings } = await listSmartRecruiters(d.identifier, { usOnly: false, max: 100 });
      if (!total) return { ok: false, total, reason: "no postings" };
      const owner = listings.find((l) => l.company?.name)?.company?.name ?? "";
      const same = namesMatch(owner, name) || normalizeCompanyName(owner).includes(normalizeCompanyName(name)) || normalizeCompanyName(name).includes(normalizeCompanyName(owner));
      return same ? { ok: true, total } : { ok: false, total, reason: `board belongs to "${owner}"` };
    }
    return { ok: true, total: -1 };
  } catch (e) {
    return { ok: false, total: 0, reason: e instanceof HttpError ? `HTTP ${e.status}` : (e as Error).message };
  }
}

/** Guess a SmartRecruiters company id ("Visa", "ServiceNow", "BoschGroup") from a name. */
export function smartRecruitersCandidates(name: string): string[] {
  const words = name.replace(/[^A-Za-z0-9 ]+/g, " ").split(/\s+/).filter(Boolean);
  const camel = words.map((w) => w[0]!.toUpperCase() + w.slice(1)).join("");
  return [...new Set([words.join(""), camel, camel.toLowerCase(), `${camel}Inc`, `${camel}Group`])];
}

/** Workday tenants hide behind wdN host numbers and arbitrary site names; try the common ones. */
export async function probeWorkday(name: string, domain: string | null): Promise<Detected | null> {
  const tenants = candidateTokens(name, domain).filter((t) => !t.includes("-")).slice(0, 2);
  const words = name.replace(/[^A-Za-z0-9 ]+/g, " ").split(/\s+/).filter(Boolean);
  const camel = words.map((w) => w[0]!.toUpperCase() + w.slice(1)).join("");
  const sites = [...new Set(["External", "Careers", "careers", "External_Careers", "ExternalCareers", "jobs", "Search", "ExternalCareerSite", `${camel}Careers`, `${camel}_Careers`, camel])];
  for (const tenant of tenants) {
    for (const wd of [1, 5, 3, 12, 103, 10, 108]) {
      for (const site of sites) {
        try {
          const res = await postJson<{ total?: number }>(
            `https://${tenant}.wd${wd}.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`,
            { appliedFacets: {}, limit: 1, offset: 0, searchText: "" },
            { retries: 0, timeoutMs: 8_000 },
          );
          if ((res.total ?? 0) > 0) return { provider: "workday", identifier: `${tenant}.wd${wd}.myworkdayjobs.com/${site}` };
        } catch {
          // keep trying
        }
      }
    }
  }
  return null;
}
