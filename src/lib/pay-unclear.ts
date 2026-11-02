// Pay we can't label honestly. Some job systems hand over a number with no word on what it covers,
// and the posting text doesn't say either. When that number is too high to be a believable base for
// the role, calling it "base" would mislead and hiding it would claim they posted nothing. So we show
// the number as "base or OTE not stated" and tell the reader to ask.

import { isChannelTitle } from "./ingest/classify";

const TO_USD: Record<string, number> = { CAD: 0.72, GBP: 1.25, EUR: 1.05 };

// Base above this (in USD terms) is usually OTE. Leaders can earn it, and so can partnerships roles.
export const BASE_CEILING: Record<string, number> = {
  "SDR/BDR": 150_000,
  "Account Manager": 220_000,
  "Customer Expansion": 220_000,
  "Account Executive": 250_000,
  "Sales Engineer": 260_000,
};

// The posting names the number: "Base pay: $80,000 - $300,000", "$234,000-286,000 plus annual bonus",
// "Annual Salary Range $94,400 to $276,500", "OTE: $300K".
export const TEXT_LABELS_PAY =
  /\b(base|salary|ote|on[- ]target|total compensation|pay range)\b[^$£€.]{0,40}[$£€]\s?\d|[$£€][\d,.]+\s*[kK]?\s*(?:-|–|to)\s*[$£€]?[\d,.]+\s*[kK]?\s*(?:USD|EUR|GBP|CAD)?\s*(?:\+|plus)\s*(?:annual |an? )?(?:bonus|commission|variable)/i;

export interface PayUnclearInput {
  title_raw?: string | null;
  role_family?: string;
  seniority?: string;
  description_raw?: string | null;
  salary_max: number | null;
  ote_min: number | null;
  currency?: string | null;
}

export function payTypeUnclear(j: PayUnclearInput): boolean {
  if (j.salary_max == null || j.ote_min != null) return false;
  const cap = j.role_family ? BASE_CEILING[j.role_family] : undefined;
  if (cap == null) return false;
  if (j.salary_max * (TO_USD[j.currency ?? "USD"] ?? 1) <= cap) return false;
  if (j.title_raw && isChannelTitle(j.title_raw)) return false;
  // Someone who manages SDRs or AEs is classed with the team but paid like a manager.
  if (j.seniority === "Manager" || (j.title_raw && /\b(manager|head|director)\b/i.test(j.title_raw) && j.role_family === "SDR/BDR")) return false;
  const text = (j.description_raw ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");
  return !TEXT_LABELS_PAY.test(text);
}
