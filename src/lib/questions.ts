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
  /** One plain line on why the answer matters. */
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
  if (has.has("commission_only")) add("No base means a slow quarter is a quarter with no paycheck.", "What did the median rep take home last year, with no base to fall back on?");
  if (has.has("uncapped_no_numbers")) add("\"Unlimited\" is a ceiling, not a number. You need the median.", "What did the median rep and the top rep actually earn last year?");
  if (has.has("clawbacks")) add("Money you earned can be taken back. Know the rules before you sign.", "Under what circumstances can commissions be clawed back, and for how long after the sale?");
  if (has.has("dial_quotas")) add("Tells you if you'll be judged on deals or on dials.", "Is the daily activity number a hard requirement, or a guide? What happens if you miss it?");
  if (has.has("aggressive_split")) add("When most of the pay is variable, this is your real salary.", "What percent of the variable did reps actually earn last year?");
  if (has.has("hustle_language")) add("Hustle language in a posting often shows up in your calendar.", "What hours do your best reps actually work?");
  if (has.has("many_hats")) add("\"Many hats\" can mean half your week isn't selling.", "What does a typical week look like? How much of it is selling?");
  if (has.has("player_coach")) add("Two jobs, one paycheck. Find out which one wins when time runs out.", "How is time split between managing the team and carrying your own number?");
  if (has.has("wide_pay_range")) add("A wide range means the top number may not be your number.", "Where in the range would someone with my background land, and why?");
  if (has.has("mass_posting")) add("Hiring a lot can mean growth, or people leaving.", "How many reps are you hiring for this, and how many from last year's class are still here?");
  if (has.has("open_90_days")) add("The answer tells you what candidates saw that made them walk.", "This role has been open a while. What's made it hard to fill?");
  if (j.company?.trend === "pulling_back") add("Fewer openings can mean cuts. Better to hear it now.", "I noticed fewer open sales roles lately. What changed?");

  // 2. The numbers that decide whether the job is doable.
  // "Fully ramped" stops the answer hiding behind new hires who were never expected to hit yet.
  if (has.has("attainment_average")) {
    add("OTE is what you could earn. This is how likely you are to earn it.", "What percentage of fully ramped reps hit quota last year?");
    // A high average can be a couple of top reps carrying everyone else.
    add("A high average can hide a team where most people missed.", "How much of last year's number came from your top two reps?");
  }
  else if (!has.has("shares_attainment")) add("OTE is what you could earn. This is how likely you are to earn it.", "What percentage of fully ramped reps hit quota last year?");
  // The answer to this one usually explains the attainment number.
  const isRep = CARRIES_NUMBER.has(j.role_family ?? "") && (j.seniority ?? "Individual Contributor") === "Individual Contributor";
  if (isRep && !has.has("coaching")) add("Coaching is often what's behind a good or bad attainment number.", "Who sits with reps and reviews calls each week?");
  if (j.salary_min == null && j.ote_min == null) add("No point investing hours before you know the number.", "What are the base and the OTE for this role?");
  else if (j.ote_min == null) add("Base is what you're guaranteed. OTE and the median show the upside.", "What's the OTE, and what did the median rep earn last year?");
  else if (j.salary_min == null) add("OTE without a base doesn't tell you what you can count on.", "What's the base, and how is the rest paid out?");
  if (j.buyer_checked_at && !j.buyer) add("Selling to a CFO and selling to a developer are different jobs.", "Who's the economic buyer, and who else is in the deal?");
  if (!d.quota_size && !has.has("states_quota")) add("A quota built from real data is a target. Otherwise it's a hope.", "What's the annual quota, and how was it set?");
  if (j.self_sourcing_level === "Unknown") add("Tells you how much of your week is prospecting versus selling.", "Where does pipeline come from: inbound, SDRs, or me?");
  else if (j.self_sourcing_level === "High") add("Shows how much pipeline you'll have to build on your own.", "What share of last year's closed deals did reps source themselves?");
  if (!has.has("ramp_support")) add("Full quota on day one means you start behind.", "How long is ramp, and what's the quota during it?");
  // Past 100% is where top reps make their money. Only ask when the posting doesn't already say it pays accelerators.
  if (isRep && !has.has("accelerators")) add("Past quota is where top reps earn most. Know if the plan pays more or stops.", "Once I hit 100% of quota, how does my commission rate change, and is there a cap on what I can earn?");
  if (!d.territory) add("An existing book is a head start. Greenfield means building from zero.", "Is the territory new or existing? Who had it before?");
  if (!d.average_deal_size && !has.has("states_deal_size")) {
    add(
      d.sales_cycle ? "Deal size tells you how many deals it takes to hit your number." : "Together they tell you how many deals it takes to hit your number.",
      d.sales_cycle ? "What's a typical deal size?" : "What's a typical deal size and sales cycle?",
    );
  }
  if (j.company?.trend === "ramping" && (j.company.open_roles ?? 0) >= 25) add("Lots of open roles can mean growth, or a revolving door.", "How many reps hired last year are still here?");

  // 3. Always worth asking.
  const picked = out.slice(0, max - 1);
  picked.push({ why: "New headcount is growth. A replacement means someone left. Ask why.", text: "Why is this role open? Did someone leave, or is it new?" });
  return picked;
}

/** Plain-text version for copying into notes. */
export function questionsAsText(title: string, company: string, qs: Question[]): string {
  return [`Questions for ${company}, ${title}`, "", ...qs.map((q, i) => `${i + 1}. ${q.text}`)].join("\n");
}
