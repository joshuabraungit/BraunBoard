// Extras a job card shows when they're true: how the pay compares with the same kind of job,
// and whether the company is hiring fast. Built once per list of cards, from cached data.

import { getPayRows } from "./salary-data";
import { allSalaryPages, baseMid, oteMid, percentile, type PayRow } from "./salaries";
import { listCompanies } from "./data";
import type { JobView } from "./data";

/** Fewer comparable postings than this and we don't rank the pay. */
const MIN_COMPARE = 20;
/** New sales jobs in 30 days before a ramping company gets the "Hiring fast" tag. */
const HIRING_FAST_MIN = 15;

export interface CardExtras {
  /** "Top 25% pay for Enterprise AEs" (up) or "Below typical for Enterprise AEs" (down). */
  pay?: { dir: "up" | "down"; text: string };
  /** "Hiring fast · 12 sales jobs this month" */
  hiring?: string;
}

type Groups = Map<string, { ote: number[]; base: number[] }>;

function group(rows: PayRow[], market: string): Groups {
  const g: Groups = new Map();
  const add = (key: string, r: PayRow) => {
    const e = g.get(key) ?? { ote: [], base: [] };
    const o = oteMid(r);
    const b = baseMid(r);
    if (o != null) e.ote.push(o);
    if (b != null) e.base.push(b);
    g.set(key, e);
  };
  for (const r of rows) {
    add(`${market}|${r.role_family}|`, r);
    if (r.sales_segment !== "Unknown") add(`${market}|${r.role_family}|${r.sales_segment}`, r);
  }
  for (const e of g.values()) {
    e.ote.sort((a, b) => a - b);
    e.base.sort((a, b) => a - b);
  }
  return g;
}

const PAGES = allSalaryPages();
/** "Enterprise AEs", "SDRs and BDRs" */
const plural = (role: string, segment: string | null) => PAGES.find((p) => p.role === role && p.segment === (segment || null))?.plural ?? null;

export async function cardExtrasFor(jobs: JobView[]): Promise<Map<string, CardExtras>> {
  const out = new Map<string, CardExtras>();
  if (!jobs.length) return out;
  const [us, uk, companies] = await Promise.all([
    getPayRows("US").catch(() => null),
    getPayRows("UK").catch(() => null),
    listCompanies().catch(() => []),
  ]);
  const groups = new Map<string, Groups>([
    ["US", group(us?.rows ?? [], "US")],
    ["UK", group(uk?.rows ?? [], "UK")],
  ]);
  const byCompany = new Map(companies.map((c) => [c.id, c]));

  for (const j of jobs) {
    const extras: CardExtras = {};

    // Pay, compared with the same role (and segment, when there are enough to compare).
    const market = (j.currency ?? "USD") === "USD" && (j.markets ?? ["US"]).includes("US") ? "US" : j.currency === "GBP" && (j.markets ?? []).includes("UK") ? "UK" : null;
    const g = market ? groups.get(market) : undefined;
    if (g) {
      const row = j as unknown as PayRow;
      const useOte = j.ote_min != null;
      const value = useOte ? oteMid(row) : j.salary_min != null ? baseMid(row) : null;
      const pick = (seg: string) => {
        const e = g.get(`${market}|${j.role_family}|${seg}`);
        const vals = e ? (useOte ? e.ote : e.base) : [];
        return vals.length >= MIN_COMPARE ? { vals, seg } : null;
      };
      const cmp = value != null ? (j.sales_segment !== "Unknown" ? pick(j.sales_segment) : null) ?? pick("") : null;
      const who = cmp ? plural(j.role_family, cmp.seg) : null;
      if (cmp && who && value != null) {
        const what = useOte ? "OTE" : "base";
        if (value >= percentile(cmp.vals, 0.75)) extras.pay = { dir: "up", text: `Top 25% ${what} for ${who}` };
        else if (value <= percentile(cmp.vals, 0.25)) extras.pay = { dir: "down", text: `Bottom 25% ${what} for ${who}` };
      }
    }

    // Company momentum: only when it's really ramping up, so the tag stays rare enough to mean something.
    // "Ramping" alone (5+ new in 30 days) covered about 1 job in 5; 15+ keeps it to the real surges.
    const c = byCompany.get(j.company_id);
    if (c?.trend === "ramping" && c.new_30d >= HIRING_FAST_MIN) extras.hiring = `Hiring fast · ${c.new_30d} sales jobs this month`;

    if (extras.pay || extras.hiring) out.set(j.id, extras);
  }
  return out;
}
