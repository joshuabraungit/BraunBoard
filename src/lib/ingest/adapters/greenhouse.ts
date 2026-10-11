// Greenhouse public Job Board API
// https://developers.greenhouse.io/job-board.html
// GET https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true

import type { Adapter, CompanyRef, RawJob } from "../types";
import { getJson } from "../http";
import { htmlToText } from "../html";

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
): Promise<{ min: number; max: number; currency: string } | null> {
  const data = await getJson<{ pay_input_ranges?: GhPayRange[] }>(
    `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs/${jobId}?pay_transparency=true`,
  );
  const ranges = data.pay_input_ranges ?? [];
  // Prefer a US range if several are listed (they're often per-zone).
  const r = ranges.find((x) => /\b(us|united states|usa)\b/i.test(x.title ?? "")) ?? ranges[0];
  if (!r?.min_cents || !r?.max_cents) return null;
  return { min: Math.round(r.min_cents / 100), max: Math.round(r.max_cents / 100), currency: r.currency_type ?? "USD" };
}
