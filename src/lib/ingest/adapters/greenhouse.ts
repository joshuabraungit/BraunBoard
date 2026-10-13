// Greenhouse public Job Board API
// https://developers.greenhouse.io/job-board.html
// GET https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true

import type { Adapter, CompanyRef, RawJob } from "../types";
import { getJson } from "../http";
import { htmlToText } from "../html";
import { validDate } from "../dates";

interface GhJob {
  id: number;
  title: string;
  absolute_url: string;
  location?: { name?: string };
  content?: string;
  updated_at?: string;
  first_published?: string;
}

interface GhPayRange {
  min_cents?: number;
  max_cents?: number;
  currency_type?: string;
  title?: string;
}

export const greenhouse: Adapter = {
  provider: "greenhouse",
  async fetchJobs(company: CompanyRef): Promise<RawJob[]> {
    const token = encodeURIComponent(company.ats_identifier);
    const data = await getJson<{ jobs: GhJob[] }>(
      `https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`,
    );
    return (data.jobs ?? []).map((j) => ({
      source_provider: "greenhouse",
      source_job_id: String(j.id),
      company: company.name,
      title: j.title.trim(),
      location: j.location?.name?.trim() ?? "",
      description: htmlToText(j.content ?? ""),
      // The list endpoint doesn't include structured pay. Use fetchPayRange()
      // for jobs that pass the sales classifier (one extra request per job).
      salary_min: null,
      salary_max: null,
      currency: null,
      apply_url: j.absolute_url,
      source_url: j.absolute_url,
      posted_at: validDate(j.first_published),
    }));
  },
};

/**
 * Structured pay transparency ranges, when the employer publishes them.
 * Only called for jobs we've already decided to keep, to limit request volume.
 */
export async function fetchGreenhousePayRange(
  boardToken: string,
  jobId: string,
  market: "US" | "CA" | "UK" = "US",
): Promise<{ min: number; max: number; currency: string; isOte: boolean } | null> {
  const data = await getJson<{ pay_input_ranges?: GhPayRange[] }>(
    `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs/${jobId}?pay_transparency=true`,
  );
  const ranges = data.pay_input_ranges ?? [];
  // Several ranges are often listed per country or zone: prefer the one for this job's market.
  if (market === "UK") {
    // Never show a US range on a UK job: only a range in pounds or labeled for the UK counts.
    const r = ranges.find((x) => x.currency_type === "GBP" || /\b(uk|united kingdom|london|gbp)\b/i.test(x.title ?? ""));
    if (!r?.min_cents || !r?.max_cents || (r.currency_type && r.currency_type !== "GBP")) return null;
    return {
      min: Math.round(r.min_cents / 100),
      max: Math.round(r.max_cents / 100),
      currency: "GBP",
      isOte: /\b(OTE|on[- ]target)\b/i.test(`${r.title ?? ""} ${(r as { blurb?: string }).blurb ?? ""}`),
    };
  }
  const want = market === "CA" ? /\b(canada|canadian|cad|ca)\b/i : /\b(us|united states|usa)\b/i;
  const r =
    ranges.find((x) => want.test(x.title ?? "") || (market === "CA" ? x.currency_type === "CAD" : x.currency_type === "USD")) ??
    ranges[0];
  if (!r?.min_cents || !r?.max_cents) return null;
  return {
    min: Math.round(r.min_cents / 100),
    max: Math.round(r.max_cents / 100),
    currency: r.currency_type ?? "USD",
    isOte: /\b(OTE|on[- ]target)\b/i.test(`${r.title ?? ""} ${(r as { blurb?: string }).blurb ?? ""}`),
  };
}
