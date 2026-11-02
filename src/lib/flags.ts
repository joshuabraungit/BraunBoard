// Red / green flags and "The Braun Read" verdict for a posting.
// Rules are deliberately plain and explainable: every flag points at something
// the posting said (or didn't say). No AI judgment calls here.

import type { Disclosures } from "./ingest/extract";
import { parseAttainment } from "./attainment";
import { germanLevel } from "./german";
import { payTypeUnclear } from "./pay-unclear";

export type FlagTone = "red" | "green";
export interface Flag {
  code: string;
  tone: FlagTone;
  label: string;
  why: string;
  /** False for heads-ups that inform the reader but don't count against the verdict. */
  scored?: boolean;
}

export interface FlagInput {
  description_raw: string | null;
  salary_min: number | null;
  salary_max: number | null;
  ote_min: number | null;
  ote_max: number | null;
  self_sourcing_level: string;
  disclosures: Partial<Disclosures> | null;
  role_family?: string;
  /** "Manager" etc. A BDR manager is classed as SDR/BDR but does the coaching. */
  seniority?: string;
  /** When the employer posted it (the site's "Posted" date). */
  first_seen_at?: string;
  title_raw?: string | null;
  currency?: string | null;
  /** Other open postings at the same company with the exact same title (filled in by the recompute job). */
  same_title_open?: number;
}

interface Rule {
  code: string;
  tone: FlagTone;
  label: string;
  why: string;
  scored?: boolean;
  test: (t: string, j: FlagInput) => boolean;
}

const hasPay = (j: FlagInput) => j.salary_min != null || j.ote_min != null;
const IC_ROLES = new Set(["SDR/BDR", "Account Executive", "Account Manager", "Customer Expansion", "Sales Engineer"]);

const RULES: Rule[] = [
  // ---- Red ----
  {
    code: "commission_only",
    tone: "red",
    label: "No base pay, commission only",
    why: "The posting says pay is commission only. No base means you carry all the risk.",
    test: (t) => /\b(commission[- ]only|100% commission|straight commission)\b/.test(t),
  },
  {
    code: "uncapped_no_numbers",
    tone: "red",
    label: "Big earnings claims, no numbers",
    why: "It sells uncapped or unlimited earnings but never says what anyone actually earns.",
    test: (t, j) => !hasPay(j) && /\b(uncapped|unlimited)\s+(commission|earning|income|upside|potential)/.test(t),
  },
  {
    code: "hustle_language",
    tone: "red",
    label: "Hints at long hours",
    why: "Words like rockstar, grind, work hard / play hard, or \"no excuses\" usually mean long hours and high turnover.",
    test: (t) => /\b(rock ?star|ninja|work hard,? play hard|grind(ing)?|killer instinct|hungry to crush|crush(ing)? (your )?quota|thick[- ]skinned|no[- ]excuses?|all gas,? no brakes)\b/.test(t),
  },
  {
    code: "dial_quotas",
    tone: "red",
    label: "High daily call targets",
    why: "It sets a daily dial or activity number. Expect to be managed on activity, not outcomes.",
    test: (t) => /\b\d{2,3}\+?\s*(cold )?(calls|dials)\s*(a|per|each)\s*day\b/.test(t),
  },
  {
    code: "clawbacks",
    tone: "red",
    label: "Commission can be taken back",
    why: "The posting mentions clawbacks. Ask exactly when commission can be taken back.",
    test: (t) => /\bclaw[- ]?backs?\b/.test(t),
  },
  {
    code: "pay_type_unclear",
    tone: "red",
    label: "Base or OTE? Ask",
    why: "They posted a number but didn't say if it's base salary or total pay with commission. It's high for a base, so ask which it is.",
    scored: false,
    test: (_t, j) => payTypeUnclear(j),
  },
  {
    code: "german_native",
    tone: "red",
    label: "Native German required",
    why: "The posting asks for native-level German. Fluent probably won't be enough.",
    scored: false,
    test: (_t, j) => germanLevel(j.description_raw) === "native",
  },
  {
    code: "german_required",
    tone: "red",
    label: "Fluent German required",
    why: "The posting asks for fluent or business-level German. Worth knowing before you apply if you only sell in English.",
    scored: false,
    test: (_t, j) => germanLevel(j.description_raw) === "fluent",
  },
  {
    code: "german_plus",
    tone: "green",
    label: "German a plus, not required",
    why: "German helps but isn't a must. English-only sellers can still apply.",
    scored: false,
    test: (_t, j) => germanLevel(j.description_raw) === "plus",
  },
  {
    code: "many_hats",
    tone: "red",
    label: "Do-everything job",
    why: "Often code for an under-resourced team where sales also does marketing, CS, and ops.",
    test: (t) => /\bwear(ing)? (many|multiple|a lot of) hats\b/.test(t),
  },
  {
    code: "wide_pay_range",
    tone: "red",
    label: "Pay range too wide to trust",
    why: "The top of the range is more than double the bottom. Ask where in that range this offer would really land.",
    scored: false, // often covers several levels or locations; a question, not a verdict
    test: (_t, j) => (j.salary_min != null && (j.salary_max ?? 0) >= j.salary_min * 2.2) || (j.ote_min != null && (j.ote_max ?? 0) >= j.ote_min * 2.2),
  },
  {
    code: "open_90_days",
    tone: "red",
    label: "Open 90+ days",
    why: "This role has been posted for three months or more. Ask why it's been hard to fill, and whether anyone left it.",
    scored: false, // already counted in the "Time on market" check
    test: (_t, j) => !!j.first_seen_at && Date.now() - new Date(j.first_seen_at).getTime() > 90 * 86_400_000,
  },
  {
    code: "mass_posting",
    tone: "red",
    label: "Same job posted many times",
    why: "The company has 8 or more open postings with this exact title. Could be a big build-out, could be a revolving door. Ask how many reps they hired last year and how many are still there.",
    scored: false, // a question to ask, not a verdict
    test: (_t, j) => (j.same_title_open ?? 0) >= 8,
  },
  {
    code: "player_coach",
    tone: "red",
    label: "Leads a team and sells",
    why: "You'd lead a team and work deals yourself. Ask whether you carry a personal quota and how your pay splits between the two.",
    scored: false,
    test: (t, j) => /\bplayer[- ]coach\b/.test(t) && ["Sales Manager", "Sales Director", "VP Sales", "CRO"].includes(j.role_family ?? ""),
  },
  {
    code: "aggressive_split",
    tone: "red",
    label: "Most pay depends on commission",
    why: "OTE is more than double the base. You only make the big number if you hit quota.",
    test: (_t, j) => j.salary_min != null && j.ote_min != null && j.ote_min >= j.salary_min * 2.2,
  },

  // ---- Green ----
  {
    code: "publishes_ote",
    tone: "green",
    label: "Publishes OTE",
    why: "It tells you the on-target earnings up front. Most postings don't.",
    test: (_t, j) => j.ote_min != null,
  },
  {
    code: "shares_attainment",
    tone: "green",
    label: "Shares quota attainment",
    why: "It says how many reps actually hit their number. That's the most honest stat in sales hiring.",
    // Only a real number about their team counts. "Track record of attainment" or "100% attainment expected" don't.
    test: (t) => parseAttainment(t)?.kind === "hit",
  },
  {
    code: "attainment_average",
    tone: "green",
    label: "Shares average attainment",
    why: "It gives the team's average attainment. Better than nothing, but a high average can mean two reps are carrying the number for everyone else. Ask how many fully ramped reps actually hit.",
    scored: false, // shown, but not the full credit of saying how many reps hit
    test: (t) => parseAttainment(t)?.kind === "average",
  },
  {
    code: "states_quota",
    tone: "green",
    label: "States the quota",
    why: "You know the number before the first call.",
    test: (_t, j) => !!j.disclosures?.quota_size,
  },
  {
    code: "states_deal_size",
    tone: "green",
    label: "States deal size",
    why: "Average deal size tells you what kind of selling this really is.",
    test: (_t, j) => !!j.disclosures?.average_deal_size,
  },
  {
    code: "pipeline_support",
    tone: "green",
    label: "Gets leads from SDRs",
    why: "You won't be building all of your own pipeline from zero.",
    test: (t, j) =>
      j.self_sourcing_level === "Low" ||
      (j.self_sourcing_level !== "High" && /\b(sdr|bdr) (support|team will|partner)|supported by (an? )?(sdr|bdr)|inbound leads?\b/.test(t)),
  },
  {
    code: "ramp_support",
    tone: "green",
    label: "Paid while you ramp up",
    why: "It mentions a ramp period or guaranteed draw, so you're not on full quota from day one.",
    test: (t) => /\b(ramp(ed)? (period|quota|time|schedule)|\d+[- ]month ramp|guaranteed (draw|commission)|non[- ]recoverable draw)\b/.test(t),
  },
  {
    code: "accelerators",
    tone: "green",
    label: "Pays more past quota",
    why: "Higher commission rates once you pass quota. Overperformance actually pays.",
    test: (t) => /\baccelerators?\b/.test(t),
  },
  {
    code: "promotion_path",
    tone: "green",
    label: "Clear path to promotion",
    why: "The posting spells out a path to the next role, like SDR to AE. Ask how long it took the last few people and what they had to hit.",
    // Only for reps. A manager "building career paths" for their team is part of the job, not a promise to you.
    test: (t, j) =>
      IC_ROLES.has(j.role_family ?? "") &&
      (j.seniority ?? "Individual Contributor") === "Individual Contributor" &&
      /\b((path|track|pathway) (to|toward|into) (becoming )?(an? )?(full |full-cycle )?(ae|account executive|eae|enterprise ae)\b|ae track\b|promotion path(way)?\b|(sdr|bdr) career path\b|career path to (ae|eae|account executive)\b)/.test(t),
  },
  {
    code: "coaching",
    tone: "green",
    label: "Real sales coaching",
    why: "The posting commits to regular coaching or call reviews. A bad attainment number usually means no coaching and no standard, not bad reps.",
    // Only for people carrying a number. For managers, "provide regular coaching" is their job, not support.
    test: (t, j) =>
      IC_ROLES.has(j.role_family ?? "") &&
      (j.seniority ?? "Individual Contributor") === "Individual Contributor" &&
      /\b(weekly|regular|ongoing|dedicated|structured|1:1|one[- ]on[- ]one)\s+(\w+\s+){0,2}(coaching|call reviews?|call coaching)\b/.test(t),
  },
];

const info = (r: Rule): Flag => ({ code: r.code, tone: r.tone, label: r.label, why: r.why, ...(r.scored === false ? { scored: false } : {}) });

export const FLAG_RULES: Readonly<Record<string, Flag>> = Object.fromEntries(
  RULES.map((r) => [r.code, info(r)]),
);

/** Flags that need data from other jobs, so only the recompute job can set them. */
const DATA_ONLY = new Set(["mass_posting"]);

export function computeFlags(j: FlagInput): Flag[] {
  const t = (j.description_raw ?? "").toLowerCase().replace(/\s+/g, " ");
  return RULES.filter((r) => r.test(t, j)).map(info);
}

/** Stored codes back to full flags (cards only have the codes). Red first. */
/**
 * Flags worth a chip on a card. "Publishes OTE" is obvious from the pay line, and the card's
 * posted date already says how long a job has been open. Both still show on the job page.
 */
// Attainment gets its own chip with the actual number (see JobCard), so its flags stay off the chip row.
const NOT_ON_CARDS = new Set(["publishes_ote", "open_90_days", "shares_attainment", "attainment_average"]);
export const cardFlags = (flags: Flag[]) => flags.filter((f) => !NOT_ON_CARDS.has(f.code));

/** True for flags that count against the verdict (real red flags, not heads-ups). */
export const isRedFlag = (f: Flag) => f.tone === "red" && f.scored !== false;
/** True for heads-ups: worth asking about, but not held against the posting. */
export const isHeadsUp = (f: Flag) => f.tone === "red" && f.scored === false;
/** Display order: red flags, then heads-ups, then green flags. */
const flagRank = (f: Flag) => (isRedFlag(f) ? 0 : isHeadsUp(f) ? 1 : 2);

export function flagsFromCodes(codes: string[] | null | undefined): Flag[] {
  return (codes ?? [])
    .map((c) => FLAG_RULES[c])
    .filter((f): f is Flag => !!f)
    .sort((a, b) => flagRank(a) - flagRank(b));
}

// ---------------------------------------------------------------------------
// The Braun Read: a verdict plus the handful of checks behind it.
// ---------------------------------------------------------------------------

export type Grade = "good" | "ok" | "bad" | "unknown";
export interface Check {
  label: string;
  grade: Grade;
  detail: string;
  /** The posting just doesn't say. Still scores as "bad", but shows as a yellow light (a question for the first call), not a red one. */
  missing?: boolean;
}
export interface BraunRead {
  verdict: "Strong posting" | "Worth a look" | "Ask hard questions" | "Proceed with caution";
  line: string;
  checks: Check[];
  flags: Flag[];
}

export interface ReadInput extends FlagInput {
  first_seen_at: string;
  /** Stored flag codes, used when the description isn't loaded. */
  flags?: string[];
  /** Company hiring velocity, when known. */
  company?: { open_roles: number; new_30d: number; closed_30d: number; trend: "ramping" | "steady" | "pulling_back" } | null;
}

const DISCLOSURE_KEYS: (keyof Disclosures)[] = ["quota_size", "quota_attainment", "average_deal_size", "territory", "sales_cycle"];

export function braunRead(j: ReadInput, now = Date.now()): BraunRead {
  const stored = flagsFromCodes(j.flags);
  const flags =
    j.description_raw == null && j.flags?.length
      ? stored
      : [...computeFlags(j), ...stored.filter((f) => DATA_ONLY.has(f.code))].filter((f, i, a) => a.findIndex((x) => x.code === f.code) === i);
  const checks: Check[] = [];

  // Pay
  if (j.ote_min != null && j.salary_min != null && j.ote_min >= j.salary_min) {
    const basePct = Math.round((j.salary_min / j.ote_min) * 100);
    checks.push({
      label: "Pay",
      grade: basePct >= 45 ? "good" : "ok",
      detail: `Base and OTE both listed. Roughly a ${basePct}/${100 - basePct} base-to-variable split.`,
    });
  } else if (j.ote_min != null) {
    checks.push({ label: "Pay", grade: "good", detail: "OTE is listed. Ask what the base is." });
  } else if (j.salary_min != null) {
    checks.push({ label: "Pay", grade: "ok", detail: "Base is listed but not OTE. Ask what the variable is and how many people hit it." });
  } else {
    checks.push({ label: "Pay", grade: "bad", detail: "No pay listed at all." });
  }

  // Transparency
  const shared = DISCLOSURE_KEYS.filter((k) => j.disclosures?.[k]).length;
  checks.push({
    label: "Transparency",
    grade: shared >= 2 ? "good" : shared === 1 ? "ok" : "bad",
    missing: shared === 0,
    detail:
      shared === 0
        ? "Says nothing about quota, attainment, deal size, territory or sales cycle."
        : `Shares ${shared} of 5: quota, attainment, deal size, territory, sales cycle.`,
  });

  // Pipeline
  const pipe: Record<string, [Grade, string]> = {
    // Hunting isn't worse than inbound, just different. Same points, the line tells you which it is.
    High: ["good", "Mostly self-sourced. Great if you like outbound, rough if you don't."],
    Medium: ["good", "A mix of self-sourced pipeline and inbound or SDR help."],
    Low: ["good", "Mostly inbound or an assigned book."],
    Unknown: ["unknown", "Doesn't say where pipeline comes from. Ask."],
  };
  const [pg, pd] = pipe[j.self_sourcing_level] ?? pipe.Unknown!;
  checks.push({ label: "Pipeline", grade: pg, detail: pd });

  // Time on market
  const days = Math.floor((now - new Date(j.first_seen_at).getTime()) / 86_400_000);
  checks.push({
    label: "Time on market",
    grade: days <= 21 ? "good" : days <= 45 ? "ok" : "bad",
    detail:
      days <= 1 ? "Brand new." : days <= 21 ? `Open ${days} days.` : days <= 45 ? `Open ${days} days. Normal, but not fresh.` : `Open ${days} days. Ask why it's been hard to fill.`,
  });

  // Company hiring
  if (j.company) {
    const { open_roles: n, new_30d, closed_30d, trend } = j.company;
    const roles = (k: number) => `${k} sales role${k === 1 ? "" : "s"}`;
    checks.push(
      trend === "pulling_back"
        ? { label: "Company hiring", grade: "bad", detail: `Pulling back: closed ${roles(closed_30d)} in 30 days and posted ${new_30d}. Ask what changed.` }
        : trend === "ramping"
          ? { label: "Company hiring", grade: n >= 25 ? "ok" : "good", detail: `Ramping up: posted ${roles(new_30d)} in the last 30 days.${n >= 25 ? " That many open roles can also mean churn. Ask how many reps are still there from last year." : ""}` }
          : { label: "Company hiring", grade: n >= 25 ? "ok" : "good", detail: n <= 1 ? "This is their only open sales role." : `${roles(n)} open, hiring at a steady pace.${n >= 25 ? " Ask how many reps they hired last year and how many are still there." : ""}` },
    );
  }

  // Verdict. Pay, transparency and pipeline earn points; time on market and hiring
  // volume only ever subtract, so a fresh posting can't coast on being fresh.
  const reds = flags.filter((f) => f.tone === "red" && f.scored !== false).length;
  const greens = flags.filter((f) => f.tone === "green" && f.scored !== false).length;
  const pts = (c: Check, core: boolean) =>
    c.grade === "bad" ? -1 : !core ? 0 : c.grade === "good" ? 2 : c.grade === "ok" ? 1 : 0;
  const core = new Set(["Pay", "Transparency", "Pipeline"]);
  const score = checks.reduce((s, c) => s + pts(c, core.has(c.label)), 0) + greens - reds * 2;
  const grade = (label: string) => checks.find((c) => c.label === label)?.grade;

  let verdict: BraunRead["verdict"];
  let line: string;
  if (reds >= 2 || score <= -2 || (reds === 1 && score < 1)) {
    verdict = "Proceed with caution";
    line = "A few things here deserve a hard look before you spend time on it.";
  } else if (reds >= 1) {
    // A real red flag never gets a positive verdict, however good the rest looks.
    verdict = "Ask hard questions";
    line = "Some good signs, but there's a red light here. Get it answered before you invest.";
  } else if (score >= 6 && reds === 0 && grade("Pay") === "good" && grade("Transparency") === "good") {
    verdict = "Strong posting";
    line = "More honest than most. You know what you're walking into.";
  } else if (score >= 3) {
    verdict = "Worth a look";
    line = "Solid on the basics. Use the first call to fill in the gaps.";
  } else {
    verdict = "Ask hard questions";
    line = "Too much is left unsaid. Make them answer before you invest.";
  }
  return { verdict, line, checks, flags };
}

/** The light a check shows. Missing info is a question (yellow), not a warning (red). */
export function checkLight(c: Check): "green" | "yellow" | "red" | "none" {
  if (c.grade === "bad") return c.missing ? "yellow" : "red";
  return c.grade === "good" ? "green" : c.grade === "ok" ? "yellow" : "none";
}
