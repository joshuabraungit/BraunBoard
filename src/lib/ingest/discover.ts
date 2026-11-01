// Company discovery: shared rules for deciding whether a company found on a job board is worth
// adding, and adding it.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AtsProvider, RawJob } from "./types";
import { classifyTitle, isTalentPool } from "./classify";
import { titleOutOfMarket } from "./location";
import { locate } from "./pipeline";
import { slugify } from "../slug";
import { normalizeDomain } from "./adapters/workable";

/** A sales job in one of our markets, judged by the same rules the crawler uses. */
export function inScopeSalesJob(job: RawJob): { markets: string[] } | null {
  if (!classifyTitle(job.title)) return null;
  const loc = locate(job);
  if (!loc.markets.length || titleOutOfMarket(job.title, loc.markets)) return null;
  if (isTalentPool(job.description)) return null;
  return { markets: loc.markets };
}

// Recruiters, staffing firms and hiring marketplaces post sales jobs for other companies. Braun Board wants the employer.
const STAFFING = /(staffing|recruit(ing|ment|ers?)\b|talent|search (partners|group)|headhunt|placement|personnel|workforce|executive search|employment agency|hiring|careers?\b)/i;
// Door-to-door, insurance agents, real estate, retail floor: sales, but not the B2B jobs we list.
const CONSUMER = /(\binsurance|income life|\brealty|real estate|solar|roof|remodel|home improvement|\bauto(motive)? (group|dealer)|dealership|\bretail|jewel(l)?er|funeral|\bwax\b|\bsalon|\bmed ?spa|\bfitness|\bgym\b|mental health|\bdental|\bpest\b|\bagencies\b)/i;
// Words a B2B posting almost always uses somewhere. A company whose postings use none of them
// is probably selling to consumers.
const B2B_TEXT = /\b(b2b|saas|software|enterprise|decision[- ]makers?|c-suite|procurement|arr|business(es)? (owners?|customers?|clients?)|companies|organi[sz]ations|distributors?|wholesale|manufactur\w*|it (teams?|leaders?)|cfos?|ctos?|cios?|vps?\b|hospitals?|health systems?|government agencies)\b/i;
const CONSUMER_TITLE = /\b(door[- ]to[- ]door|in[- ]home|field sales|retail|store|jewel(le)?ry|funeral|insurance (agent|sales)|life insurance|realtor|solar|roofing|per hour|\/hr\b|costco|at&t|directv)\b/i;

/** Why a candidate needs a closer look before approving, or null if it looks like a normal employer. */
export function candidateNote(name: string, titles: string[], descriptions: string[], domain: string | null = null): string | null {
  const who = `${name} ${domain ?? ""}`;
  if (STAFFING.test(who)) return "Name looks like a recruiter or staffing firm";
  if (CONSUMER.test(who)) return "Name looks like consumer or field sales";
  const text = descriptions.join("\n").slice(0, 20_000);
  if (/\b(on behalf of (our|a) client|our client is (a|an|looking)|confidential client)\b/i.test(text)) return "Postings say they're for a client (recruiter?)";
  if (/\b(commission[- ]only|100% commission|1099 (contractor|position))\b/i.test(text)) return "Commission-only or 1099 roles";
  const consumer = titles.filter((t) => CONSUMER_TITLE.test(t)).length;
  if (consumer && consumer >= titles.length / 2) return "Titles look like field, retail or consumer sales";
  if (/\b(hourly pay|per hour|\$\d+(\.\d+)?\s*(\/|per)\s*h(ou)?r)\b/i.test(text) && !/\b(SaaS|software|platform|B2B)\b/i.test(text)) return "Hourly pay, no sign of B2B selling";
  if (text.trim() && !B2B_TEXT.test(text)) return "No sign of B2B selling in the postings";
  return null;
}

export interface FoundCompany {
  name: string;
  domain: string | null;
  provider: AtsProvider;
  identifier: string;
  source: string;
  jobs: { title: string; description: string; markets: string[] }[];
}

export { normalizeDomain };

/**
 * Add found companies to Braun Board. No review step: a company that passes the checks is added
 * and crawled within the hour; one that's flagged (recruiter, consumer or field sales, no sign of
 * B2B selling) is left out. Anything already on Braun Board, including a company you've turned
 * off, is never touched. Every company seen is logged in company_candidates with what happened
 * and why, so a bad call can be traced.
 */
export async function addDiscovered(db: SupabaseClient, found: FoundCompany[]): Promise<{ added: string[]; left_out: number; already: number }> {
  const { data: cos, error } = await db.from("companies").select("slug, domain, ats_provider, ats_identifier");
  if (error) throw error;
  const boards = new Set((cos ?? []).map((c) => `${c.ats_provider}|${String(c.ats_identifier ?? "").toLowerCase()}`));
  const slugs = new Set((cos ?? []).map((c) => c.slug as string));
  const domains = new Set((cos ?? []).map((c) => normalizeDomain(c.domain as string | null)).filter(Boolean));

  const now = new Date().toISOString();
  const added: string[] = [];
  let leftOut = 0;
  let already = 0;
  const log: Record<string, unknown>[] = [];
  const toAdd: Record<string, unknown>[] = [];
  for (const f of found) {
    const key = `${f.provider}|${f.identifier.toLowerCase()}`;
    if (boards.has(key) || slugs.has(slugify(f.name)) || (f.domain && domains.has(f.domain))) {
      already++;
      continue;
    }
    const titles = [...new Set(f.jobs.map((j) => j.title))];
    const note = candidateNote(f.name, titles, f.jobs.map((j) => j.description), f.domain);
    log.push({
      name: f.name,
      domain: f.domain,
      ats_provider: f.provider,
      ats_identifier: f.identifier,
      source: f.source,
      sales_jobs: f.jobs.length,
      sample_titles: titles.slice(0, 5),
      markets: [...new Set(f.jobs.flatMap((j) => j.markets))].sort(),
      status: note ? "rejected" : "approved",
      note,
      last_found_at: now,
      decided_at: now,
    });
    if (note) {
      leftOut++;
      continue;
    }
    let slug = slugify(f.name);
    if (slugs.has(slug)) slug = slugify(`${f.name} ${f.identifier}`);
    slugs.add(slug);
    toAdd.push({
      slug,
      name: f.name,
      domain: f.domain,
      website_url: f.domain ? `https://${f.domain}` : null,
      ats_provider: f.provider,
      ats_identifier: f.identifier,
      is_disabled: false,
      last_crawled_at: null,
    });
    added.push(f.name);
  }
  for (let i = 0; i < log.length; i += 200) {
    const { error: e } = await db.from("company_candidates").upsert(log.slice(i, i + 200), { onConflict: "ats_provider,ats_identifier" });
    if (e) throw e;
  }
  for (let i = 0; i < toAdd.length; i += 200) {
    const { error: e } = await db.from("companies").upsert(toAdd.slice(i, i + 200), { onConflict: "ats_provider,ats_identifier", ignoreDuplicates: true });
    if (e) throw e;
  }
  return { added, left_out: leftOut, already };
}
