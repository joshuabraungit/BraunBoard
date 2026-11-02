// Daily data checks: things that load fine but are wrong. Each one is a mistake we've actually hit:
// a job filed under the wrong country, OTE shown as base, a market whose crawl quietly stopped,
// a German-language posting that slipped through, the same job listed twice.
// Pure functions over rows, so they're tested without a database.

import { parseLocation } from "./ingest/location";
import { writtenInGerman } from "./ingest/classify";
import { payTypeUnclear } from "./pay-unclear";
import { descriptionSimilarity } from "./ingest/dedupe";
import type { Market } from "./ingest/location";

export interface QaJob {
  id: string;
  slug: string;
  title_raw: string;
  company_name: string;
  location_raw: string | null;
  markets: string[] | null;
  city: string | null;
  role_family: string;
  salary_max_usd: number | null;
  currency: string | null;
  salary_min: number | null;
  salary_max: number | null;
  first_seen_at: string;
  role_group: string | null;
  seniority?: string;
  ote_min?: number | null;
  flags?: string[] | null;
  description_raw?: string | null;
}

export interface QaIssue {
  check: string;
  /** Plain-English line for the email. */
  line: string;
  examples: string[];
}

const DAY = 86_400_000;
const MARKET_NAME: Record<string, string> = { US: "US", CA: "Canada", UK: "UK", DE: "Germany" };
/** First seen in the last 2 days. Job-level checks only look at these, so the email flags new problems, not the same ones daily. */
const isNew = (j: QaJob, now: number) => now - new Date(j.first_seen_at).getTime() < 2 * DAY;
const ex = (j: QaJob, note = "") => `${j.company_name}: ${j.title_raw}${note ? ` (${note})` : ""} — braunboard.com/jobs/${j.slug}`;

/** Its location lists a country we cover, but it isn't on that country's board. What Dao found. */
export function missingMarkets(jobs: QaJob[], now = Date.now()): QaIssue | null {
  const bad = jobs
    .map((j) => {
      if (!j.location_raw || !isNew(j, now)) return null;
      const parsed = parseLocation(j.location_raw);
      // A bare "Remote" or "Distributed" defaults to US; the crawler places those from the title instead.
      if (parsed.country == null) return null;
      const want = parsed.markets;
      const missing = want.filter((m) => !(j.markets ?? []).includes(m));
      return missing.length ? { j, missing } : null;
    })
    .filter((x): x is { j: QaJob; missing: Market[] } => !!x);
  if (!bad.length) return null;
  return {
    check: "missing_market",
    line: `${bad.length} job${bad.length > 1 ? "s list" : " lists"} a country in the location but ${bad.length > 1 ? "aren't" : "isn't"} on that country's board.`,
    examples: bad.slice(0, 5).map(({ j, missing }) => ex(j, `${j.location_raw} · missing ${missing.map((m) => MARKET_NAME[m]).join(", ")}`)),
  };
}

/** New jobs showing pay as base when the posting doesn't back that up (the flag should have caught it). */
export function baseLooksLikeOte(jobs: QaJob[], now = Date.now()): QaIssue | null {
  const bad = jobs.filter((j) => isNew(j, now) && !(j.flags ?? []).includes("pay_type_unclear") && payTypeUnclear({ ...j, ote_min: j.ote_min ?? null }));
  if (!bad.length) return null;
  return {
    check: "base_is_ote",
    line: `${bad.length} new job${bad.length > 1 ? "s show" : " shows"} pay as base when the posting doesn't say so. The "Base or OTE?" label didn't kick in.`,
    examples: bad.slice(0, 5).map((j) => ex(j, `${j.role_family}, up to ${Math.round((j.salary_max ?? 0) / 1000)}K ${j.currency ?? "USD"}`)),
  };
}

/** A market with no new jobs in 3 days: its crawl has probably stopped. */
export function quietMarkets(jobs: QaJob[], now = Date.now()): QaIssue | null {
  const quiet = (["US", "CA", "UK", "DE"] as const).filter(
    (m) => !jobs.some((j) => (j.markets ?? []).includes(m) && now - new Date(j.first_seen_at).getTime() < 3 * DAY),
  );
  if (!quiet.length) return null;
  return {
    check: "quiet_market",
    line: `No new jobs in 3 days for ${quiet.map((m) => MARKET_NAME[m]).join(", ")}. The crawl for ${quiet.length > 1 ? "those" : "that"} may have stopped.`,
    examples: [],
  };
}

/** Postings written in German. We only list English ones. */
export function germanPostings(jobs: QaJob[], now = Date.now()): QaIssue | null {
  const bad = jobs.filter((j) => isNew(j, now) && writtenInGerman(j.description_raw));
  if (!bad.length) return null;
  return {
    check: "german_posting",
    line: `${bad.length} posting${bad.length > 1 ? "s are" : " is"} written in German but showing on the board.`,
    examples: bad.slice(0, 5).map((j) => ex(j)),
  };
}

/**
 * The same job twice: same company, title and city, and nearly the same posting. Holding companies
 * (one "Account Executive" title for five different businesses) post different jobs under one name,
 * so the text has to match too. Needs both descriptions.
 */
// Lower than the crawler's own duplicate bar: a repost often changes a paragraph or adds the pay.
const REPOST_SIMILARITY = 0.5;

export function duplicateListings(jobs: QaJob[], now = Date.now()): QaIssue | null {
  const seen = new Map<string, QaJob>();
  const bad: QaJob[] = [];
  for (const j of jobs) {
    if (j.role_group) continue; // a city copy, grouped on purpose
    const k = `${j.company_name}|${j.title_raw.trim().toLowerCase()}|${(j.city ?? j.location_raw ?? "").toLowerCase()}`;
    const first = seen.get(k);
    if (!first) seen.set(k, j);
    else if ((isNew(j, now) || isNew(first, now)) && first.description_raw && j.description_raw && descriptionSimilarity(first.description_raw, j.description_raw) >= REPOST_SIMILARITY)
      bad.push(isNew(j, now) ? j : first);
  }
  if (!bad.length) return null;
  return {
    check: "duplicate",
    line: `${bad.length} job${bad.length > 1 ? "s are" : " is"} listed twice.`,
    examples: bad.slice(0, 5).map((j) => ex(j)),
  };
}

export function runDataQa(jobs: QaJob[], now = Date.now()): QaIssue[] {
  return [missingMarkets(jobs, now), baseLooksLikeOte(jobs, now), quietMarkets(jobs, now), germanPostings(jobs, now), duplicateListings(jobs, now)].filter(
    (x): x is QaIssue => !!x,
  );
}
