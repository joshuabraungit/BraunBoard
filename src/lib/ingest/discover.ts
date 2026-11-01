// Company discovery: shared rules for deciding whether a company found on a job board is worth
// a look, and saving it to the approval queue (Admin > Discover).

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

// Recruiters and staffing firms post sales jobs for other companies. Braun Board wants the employer.
const STAFFING = /\b(staffing|recruit(ing|ment|ers?)|talent (partners|solutions|acquisition)|search (partners|group)|headhunt|placement|personnel|workforce solutions|executive search|employment agency)\b/i;
// Door-to-door, insurance agents, real estate, retail floor: sales, but not the B2B jobs we list.
const CONSUMER = /\b(insurance agency|realty|real estate|solar|roofing|home improvement|auto(motive)? (group|dealer)|dealership|retail)\b/i;

/** Why a candidate needs a closer look before approving, or null if it looks like a normal employer. */
export function candidateNote(name: string, titles: string[], descriptions: string[]): string | null {
  if (STAFFING.test(name)) return "Name looks like a recruiter or staffing firm";
  if (CONSUMER.test(name)) return "Name looks like consumer or field sales";
  const text = descriptions.join("\n").slice(0, 20_000);
  if (/\b(on behalf of (our|a) client|our client is (a|an|looking)|confidential client)\b/i.test(text)) return "Postings say they're for a client (recruiter?)";
  if (/\b(commission[- ]only|100% commission|1099 (contractor|position))\b/i.test(text)) return "Commission-only or 1099 roles";
  if (titles.every((t) => /\b(retail|store|insurance agent|realtor)\b/i.test(t))) return "Titles look like retail or consumer sales";
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
 * Save found companies to the queue. Skips anything already on Braun Board (same board, same
 * name, or same domain). Never touches a decision already made: approved or rejected rows only
 * get their counts refreshed.
 */
export async function saveCandidates(db: SupabaseClient, found: FoundCompany[]): Promise<{ added: number; refreshed: number; skipped: number }> {
  const { data: cos, error } = await db.from("companies").select("slug, domain, ats_provider, ats_identifier");
  if (error) throw error;
  const boards = new Set((cos ?? []).map((c) => `${c.ats_provider}|${String(c.ats_identifier ?? "").toLowerCase()}`));
  const slugs = new Set((cos ?? []).map((c) => c.slug as string));
  const domains = new Set((cos ?? []).map((c) => normalizeDomain(c.domain as string | null)).filter(Boolean));

  const { data: existing } = await db.from("company_candidates").select("ats_provider, ats_identifier, status");
  const known = new Map((existing ?? []).map((c) => [`${c.ats_provider}|${String(c.ats_identifier).toLowerCase()}`, c.status as string]));

  let added = 0;
  let refreshed = 0;
  let skipped = 0;
  const now = new Date().toISOString();
  // New and refreshed rows go in separate batches: a batch upsert fills columns one row leaves out
  // with null, which would wipe the note and first-found date on refreshed rows.
  const fresh: Record<string, unknown>[] = [];
  const again: Record<string, unknown>[] = [];
  for (const f of found) {
    const key = `${f.provider}|${f.identifier.toLowerCase()}`;
    if (boards.has(key) || slugs.has(slugify(f.name)) || (f.domain && domains.has(f.domain))) {
      skipped++;
      continue;
    }
    const markets = [...new Set(f.jobs.flatMap((j) => j.markets))].sort();
    const titles = [...new Set(f.jobs.map((j) => j.title))];
    const base = {
      name: f.name,
      domain: f.domain,
      ats_provider: f.provider,
      ats_identifier: f.identifier,
      source: f.source,
      sales_jobs: f.jobs.length,
      sample_titles: titles.slice(0, 5),
      markets,
      last_found_at: now,
    };
    if (known.has(key)) {
      refreshed++;
      again.push(base);
    } else {
      added++;
      fresh.push({ ...base, note: candidateNote(f.name, titles, f.jobs.map((j) => j.description)), first_found_at: now });
    }
  }
  for (const rows of [fresh, again]) {
    for (let i = 0; i < rows.length; i += 200) {
      const { error: e } = await db.from("company_candidates").upsert(rows.slice(i, i + 200), { onConflict: "ats_provider,ats_identifier" });
      if (e) throw e;
    }
  }
  return { added, refreshed, skipped };
}
