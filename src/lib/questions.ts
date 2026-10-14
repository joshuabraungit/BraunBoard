// "Questions to ask": turns what a posting leaves out (and its red flags) into plain
// questions for the first call. Pure function, built only from facts we already have.

import type { Flag } from "./flags";
import type { Disclosures } from "./ingest/extract";

export interface QuestionInput {
  salary_min: number | null;
  ote_min: number | null;
  self_sourcing_level: string;
  disclosures: Partial<Disclosures> | null;
  role_family?: string;
  seniority?: string;
  /** Set once the posting has been read for its buyer; null buyer then means it isn't stated. */
  buyer?: string | null;
  buyer_checked_at?: string | null;
  flags: Flag[];
  company?: { trend?: string; open_roles?: number } | null;
}

export interface Question {
  /** Short reason it's on the list, e.g. "Not in the posting". */
  why: string;
  text: string;
}

const CARRIES_NUMBER = new Set(["SDR/BDR", "Account Executive", "Account Manager", "Customer Expansion"]);

/** Up to `max` questions, most important first. */
export function questionsFor(j: QuestionInput, max = 6): Question[] {
  const has = new Set(j.flags.map((f) => f.code));
  const d = j.disclosures ?? {};
  const out: Question[] = [];
  const add = (why: string, text: string) => out.push({ why, text });

  // 1. Red flags first: these are the things most likely to change your mind.
  if (has.has("commission_only")) add("Commission only", "What did the median rep take home last year, with no base to fall back on?");
  if (has.has("uncapped_no_numbers")) add("\"Unlimited\" with no numbers", "What did the median rep and the top rep actually earn last year?");
  if (has.has("clawbacks")) add("Clawbacks", "When do clawbacks kick in, and how often has it happened in the last year?");
  if (has.has("dial_quotas")) add("Call quotas", "Is the daily activity number a hard requirement, or a guide? What happens if you miss it?");
  if (has.has("aggressive_split")) add("Mostly variable pay", "What percent of the variable did reps actually earn last year?");
  if (has.has("hustle_language")) add("Hustle language", "What hours do your best reps actually work?");
  if (has.has("many_hats")) add("\"Many hats\"", "What does a typical week look like? How much of it is selling?");
  if (has.has("player_coach")) add("Player-coach", "How is time split between managing the team and carrying your own number?");
  if (has.has("wide_pay_range")) add("Wide pay range", "Where in the range would someone with my background land, and why?");
  if (has.has("mass_posting")) add("Same role posted many times", "How many reps are you hiring for this, and how many from last year's class are still here?");
  if (has.has("open_90_days")) add("Open 90+ days", "This role has been open a while. What's made it hard to fill?");
  if (j.company?.trend === "pulling_back") add("Company pulling back", "I noticed fewer open sales roles lately. What changed?");

  // 2. The numbers that decide whether the job is doable.
  // "Fully ramped" stops the answer hiding behind new hires who were never expected to hit yet.
  if (has.has("attainment_average")) add("They only share an average", "What percentage of fully ramped reps hit quota last year? An average can hide a lot.");
  else if (!has.has("shares_attainment")) add("Not in the posting", "What percentage of fully ramped reps hit quota last year?");
  // The answer to this one usually explains the attainment number.
  const isRep = CARRIES_NUMBER.has(j.role_family ?? "") && (j.seniority ?? "Individual Contributor") === "Individual Contributor";
  if (isRep && !has.has("coaching")) add("Explains the attainment number", "Who sits with reps and reviews calls each week?");
  if (j.salary_min == null && j.ote_min == null) add("No pay listed", "What are the base and the OTE for this role?");
  else if (j.ote_min == null) add("No OTE listed", "What's the OTE, and what did the median rep earn last year?");
  else if (j.salary_min == null) add("No base listed", "What's the base, and how is the rest paid out?");
  if (j.buyer_checked_at && !j.buyer) add("Buyer not in the posting", "Who's the economic buyer, and who else is in the deal?");
  if (!d.quota_size && !has.has("states_quota")) add("Not in the posting", "What's the annual quota, and how was it set?");
  if (j.self_sourcing_level === "Unknown") add("Not in the posting", "Where does pipeline come from: inbound, SDRs, or me?");
  else if (j.self_sourcing_level === "High") add("Mostly self-sourced", "What share of last year's closed deals did reps source themselves?");
  if (!has.has("ramp_support")) add("Not in the posting", "How long is ramp, and what's the quota during it?");
  if (!d.territory) add("Not in the posting", "Is the territory new or existing? Who had it before?");
  if (!d.average_deal_size && !has.has("states_deal_size")) {
    add("Not in the posting", d.sales_cycle ? "What's a typical deal size?" : "What's a typical deal size and sales cycle?");
  }
  if (j.company?.trend === "ramping" && (j.company.open_roles ?? 0) >= 25) add("Lots of open roles", "How many reps hired last year are still here?");

  // 3. Always worth asking.
  const picked = out.slice(0, max - 1);
  picked.push({ why: "Always ask", text: "Why is this role open? Did someone leave, or is it new?" });
  return picked;
}

/** Plain-text version for copying into notes. */
export function questionsAsText(title: string, company: string, qs: Question[]): string {
  return [`Questions for ${company}, ${title}`, "", ...qs.map((q, i) => `${i + 1}. ${q.text}`)].join("\n");
}
