// New Business or Account Growth: the plain-English name for a job's sales motion.
// New Business means winning new customers ("New Logo"). Account Growth means growing customers the company already has ("Expansion").
// Some jobs do both ("Mixed"). Underneath it's the same sales_motion column the filter has always used.

import type { SalesMotion } from "./ingest/types";

// Labels on the site. Josh doesn't use "hunter" (it sounds like going for the kill), so the site says
// New Business and Account Growth. "Hunter"/"farmer" stay only as words we look for in job titles.
export const HUNTER_LABELS: Partial<Record<SalesMotion, string>> = {
  "New Logo": "New Business",
  Expansion: "Account Growth",
  Mixed: "New Business + Account Growth",
};

export const HUNTER_WHY: Partial<Record<SalesMotion, string>> = {
  "New Logo": "New Business: you win brand-new customers.",
  Expansion: "Account Growth: you grow customers the company already has (upsell, cross-sell, renewals).",
  Mixed: "New Business + Account Growth: you win new customers and grow existing ones.",
};

/** What the filter offers, in order. Partnerships has its own spot in the Role list. */
export const HUNTER_FILTER: SalesMotion[] = ["New Logo", "Expansion", "Mixed"];

const HUNTER_TITLE = /\b(hunters?|new business|new logos?|net[- ]new|acquisition)\b/i;
const FARMER_TITLE = /\b(growers?|farmers?|existing business|existing customers?|install(ed)? base|account management)\b/i;

/**
 * The job title, when it says so, beats anyone's read of the description.
 * Stripe and plenty of others put it right in the title: "Account Executive, Enterprise - Hunter",
 * "Account Executive, Platforms (Grower)", "Account Executive, DACH, Commercial (Existing Business)".
 */
export function motionFromTitle(title: string | null | undefined): SalesMotion | null {
  if (!title) return null;
  const hunter = HUNTER_TITLE.test(title);
  const farmer = FARMER_TITLE.test(title);
  if (hunter && farmer) return "Mixed";
  if (hunter) return "New Logo";
  if (farmer) return "Expansion";
  return null;
}
