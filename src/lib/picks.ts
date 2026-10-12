// Braun's Picks: choose the week's jobs and write the default copy. Pure functions only;
// the database and email sending live in picks-db.ts and picks-email.ts.
//
// Rules (so autopilot never embarrasses anyone):
// - Picks must publish pay and get a "Strong posting" or "Worth a look" Braun Read.
// - One job per company, at most 2 per role, at most 3 per segment.
// - Takes only restate facts we have. The "skip" names the posting's red flags, never the company.

import { braunRead, flagsFromCodes, type ReadInput } from "./flags";
import { formatComp, formatLocation, money } from "./format";

export interface PickCandidate extends ReadInput {
  id: string;
  slug: string;
  title_raw: string;
  company_id: string;
  company_name: string;
  role_family: string;
  sales_segment: string;
  remote_type: string;
  city: string | null;
  state: string | null;
  location_raw?: string | null;
  summary: string | null;
  flags?: string[];
}

export const PICK_COUNT = 5;
const FRESH_DAYS = 14;
const SEVERE = new Set(["commission_only", "uncapped_no_numbers", "hustle_language", "dial_quotas", "clawbacks", "many_hats"]);

const daysOld = (j: PickCandidate, now: number) => (now - new Date(j.first_seen_at).getTime()) / 86_400_000;
const oteMid = (j: PickCandidate) => (j.ote_min == null ? null : (j.ote_min + (j.ote_max ?? j.ote_min)) / 2);
const hasPay = (j: PickCandidate) => j.salary_min != null || j.ote_min != null;

export function scorePick(j: PickCandidate, now = Date.now()): number | null {
  if (!hasPay(j) || daysOld(j, now) > FRESH_DAYS) return null;
  const read = braunRead(j, now);
  if (read.verdict !== "Strong posting" && read.verdict !== "Worth a look") return null;
  if (read.flags.some((f) => f.tone === "red")) return null;
  const greens = read.flags.filter((f) => f.tone === "green").length;
  const d = daysOld(j, now);
  return (
    (read.verdict === "Strong posting" ? 30 : 15) +
    greens * 4 +
    Math.min(20, (oteMid(j) ?? (j.salary_min ?? 0) * 1.6) / 20_000) +
    (d <= 3 ? 10 : d <= 7 ? 6 : 2) +
    (j.company?.trend === "ramping" ? 6 : 0) +
    (j.summary ? 3 : 0)
  );
}

/** Top picks with variety: one per company, max 2 per role, max 3 per segment. */
export function choosePicks(cands: PickCandidate[], n = PICK_COUNT, now = Date.now(), exclude: Set<string> = new Set()): PickCandidate[] {
  const scored = cands
    .filter((c) => !exclude.has(c.id))
    .map((c) => ({ c, s: scorePick(c, now) }))
    .filter((x): x is { c: PickCandidate; s: number } => x.s != null)
    .sort((a, b) => b.s - a.s);
  const out: PickCandidate[] = [];
  const byCompany = new Set<string>();
  const byRole = new Map<string, number>();
  const bySeg = new Map<string, number>();
  for (const { c } of scored) {
    if (out.length >= n) break;
    if (byCompany.has(c.company_id)) continue;
    if ((byRole.get(c.role_family) ?? 0) >= 2) continue;
    if (c.sales_segment !== "Unknown" && (bySeg.get(c.sales_segment) ?? 0) >= 3) continue;
    out.push(c);
    byCompany.add(c.company_id);
    byRole.set(c.role_family, (byRole.get(c.role_family) ?? 0) + 1);
    bySeg.set(c.sales_segment, (bySeg.get(c.sales_segment) ?? 0) + 1);
  }
  return out;
}

/** The week's "one to skip": the freshest posting with the most serious red flags. */
export function chooseSkip(cands: PickCandidate[], avoidCompanies: Set<string>, now = Date.now()): PickCandidate | null {
  let best: { c: PickCandidate; s: number } | null = null;
  for (const c of cands) {
    if (avoidCompanies.has(c.company_id) || daysOld(c, now) > FRESH_DAYS) continue;
    const severe = braunRead(c, now).flags.filter((f) => SEVERE.has(f.code)).length;
    if (!severe) continue;
    const s = severe * 10 + (hasPay(c) ? 0 : 5) + (daysOld(c, now) <= 7 ? 3 : 0);
    if (!best || s > best.s) best = { c, s };
  }
  return best?.c ?? null;
}

// ---------------------------------------------------------------------------
// Default copy. The AI writes better takes; this is the safe fallback.
// ---------------------------------------------------------------------------

const GREEN_LINES: Record<string, string> = {
  shares_attainment: "They tell you how many reps hit quota. That's rare.",
  states_quota: "The quota is in the posting, so no surprises later.",
  ramp_support: "There's a real ramp, so you're not on full quota day one.",
  accelerators: "Accelerators past quota, so overperformance actually pays.",
  states_deal_size: "Deal size is spelled out, so you know what kind of selling this is.",
  pipeline_support: "You get SDR or inbound help, not a blank territory.",
};

const firstSentence = (s: string) => {
  const m = s.match(/^.*?[.!?](\s|$)/);
  return (m ? m[0] : s).trim();
};

export function templateTake(j: PickCandidate): string {
  const lines: string[] = [];
  const codes = new Set((j.flags?.length ? flagsFromCodes(j.flags) : braunRead(j).flags).map((f) => f.code));
  for (const code of Object.keys(GREEN_LINES)) if (codes.has(code) && lines.length < 2) lines.push(GREEN_LINES[code]!);
  if (j.salary_min != null && j.ote_min != null && j.ote_min >= j.salary_min && lines.length < 2) {
    const b = Math.round((j.salary_min / j.ote_min) * 100);
    if (b >= 50) lines.push(`A ${b}/${100 - b} split, so the base carries real weight.`);
  }
  if (j.company?.trend === "ramping" && lines.length < 2) lines.push(`They're hiring fast: ${j.company.new_30d} sales roles in 30 days.`);
  if (lines.length < 2 && j.summary) lines.unshift(firstSentence(j.summary));
  if (!lines.length) lines.push("Pay is published and the posting is straight about the job. Worth a first call.");
  return lines.join(" ");
}

const SKIP_LINES: Record<string, string> = {
  uncapped_no_numbers: "promises \"unlimited earnings\" but never says what anyone actually makes",
  commission_only: "is commission only, so you carry all the risk",
  dial_quotas: "sets a daily dial number",
  hustle_language: "leans on hustle-culture language",
  clawbacks: "mentions commission clawbacks",
  many_hats: "wants you to \"wear many hats\"",
};

export function skipTake(j: PickCandidate): string {
  const reds = braunRead(j).flags.filter((f) => SEVERE.has(f.code)).map((f) => SKIP_LINES[f.code]!).slice(0, 3);
  const list = reds.length > 1 ? `${reds.slice(0, -1).join(", ")} and ${reds[reds.length - 1]}` : reds[0];
  const lesson = j.ote_min == null && j.salary_min == null ? "If they won't put a number in writing, that is the answer." : "Ask about it on the first call before you invest more time.";
  return `One posting this week ${list}. ${lesson}`;
}

export function pickPay(j: PickCandidate): string {
  return formatComp(j) || "Pay not listed";
}

export function pickMeta(j: PickCandidate): string {
  return [formatLocation({ remote_type: j.remote_type, city: j.city, state: j.state, location_raw: j.location_raw ?? null }), j.sales_segment !== "Unknown" ? j.sales_segment : null]
    .filter(Boolean)
    .join(" · ");
}

export function subjectFor(picks: PickCandidate[]): string {
  const top = [...picks].sort((a, b) => (oteMid(b) ?? 0) - (oteMid(a) ?? 0))[0];
  if (!top) return "Braun's Picks: this week's sales jobs worth a look";
  const o = oteMid(top);
  const hook = o ? `${money(top.ote_max ?? o)} OTE at ${top.company_name}` : `${top.title_raw} at ${top.company_name}`;
  return `Braun's Picks: ${hook} + ${picks.length - 1} more`;
}

export const DEFAULT_INTRO = "5 sales jobs I'd actually look at this week, and one I'd skip.";

// ---------------------------------------------------------------------------
// Scheduling: issues go out Tuesday 8am New York time.
// ---------------------------------------------------------------------------

const NY = "America/New_York";

function nyParts(d: Date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: NY, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return { y: +p.year!, m: +p.month!, d: +p.day!, h: +p.hour! % 24, min: +p.minute!, wd: p.weekday! };
}

/** The next Tuesday after today in New York, as YYYY-MM-DD. */
export function nextIssueDate(now = new Date()): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const p = nyParts(now);
  let add = (2 - days.indexOf(p.wd) + 7) % 7;
  if (add === 0) add = 7;
  const d = new Date(Date.UTC(p.y, p.m - 1, p.d + add));
  return d.toISOString().slice(0, 10);
}

/** 8:00am New York time on the given date, as a UTC ISO string (handles daylight saving). */
export function sendAtFor(issueDate: string, hour = 8): string {
  const [y, m, d] = issueDate.split("-").map(Number) as [number, number, number];
  let t = Date.UTC(y, m - 1, d, hour + 5); // guess EST
  for (let i = 0; i < 2; i++) {
    const p = nyParts(new Date(t));
    t += ((hour - p.h) * 60 - p.min) * 60_000;
  }
  return new Date(t).toISOString();
}
