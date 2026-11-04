// Loads every visible job's pay fields for the salary pages. Public data, so it uses a
// plain anon client (no cookies) and is cached for an hour across requests.
//
// Vercel's data cache skips anything over 2MB, and a skipped cache means a full re-download
// of every job on every page view (that's what blew the Supabase quota on Nov 3, 2026).
// So each country is cached on its own, filtered in the database, and stored as compact
// arrays (no repeated column names). The US set is about half the old size this way.
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "./supabase/server";
import { SAMPLE_JOBS } from "./sample-data";
import type { PayRow } from "./salaries";

const FIELDS = [
  "slug",
  "title_raw",
  "role_family",
  "sales_segment",
  "remote_type",
  "city",
  "state",
  "salary_min",
  "salary_max",
  "ote_min",
  "ote_max",
  "company_name",
  "company_slug",
  "posted_at",
] as const;
const COLUMNS = [...FIELDS, "currency", "markets"].join(", ");

type Market = "US" | "UK";
type Row = PayRow & { currency: string | null; markets: string[] | null };
type Packed = (string | number | null)[];

/** US report: US roles paid in dollars. UK report: UK-only roles paid in pounds. Currencies are never mixed. */
const keep = (market: Market) =>
  market === "UK"
    ? (r: Row) => (r.markets ?? []).includes("UK") && !(r.markets ?? []).includes("US") && (r.currency ?? "GBP") === "GBP"
    : (r: Row) => (r.currency ?? "USD") === "USD" && (r.markets ?? ["US"]).includes("US");

const pack = (r: Row): Packed => FIELDS.map((f) => r[f] as string | number | null);
const unpack = (p: Packed): PayRow => Object.fromEntries(FIELDS.map((f, i) => [f, p[i]])) as unknown as PayRow;

async function load(market: Market): Promise<{ rows: Packed[]; loadedAt: string }> {
  if (!isSupabaseConfigured()) {
    const sample = SAMPLE_JOBS.map((j) => ({ ...j, posted_at: j.first_seen_at })) as unknown as Row[];
    return { rows: sample.filter(keep(market)).map(pack), loadedAt: new Date().toISOString() };
  }
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  const rows: Packed[] = [];
  for (let from = 0; ; from += 1000) {
    let q = db.from("visible_jobs").select(COLUMNS);
    // Narrow in the database so only this country's rows come over the wire.
    q =
      market === "UK"
        ? q.contains("markets", ["UK"]).not("markets", "cs", "{US}").or("currency.is.null,currency.eq.GBP")
        : q.or("currency.is.null,currency.eq.USD").or("markets.is.null,markets.cs.{US}");
    const { data, error } = await q.order("id").range(from, from + 999);
    if (error) throw new Error(`salary data: ${error.message}`);
    const page = (data ?? []) as unknown as Row[];
    // Same rule again in code, so the report never changes even if the query filter drifts.
    rows.push(...page.filter(keep(market)).map(pack));
    if (page.length < 1000) break;
  }
  return { rows, loadedAt: new Date().toISOString() };
}

const loadCached = unstable_cache(load, ["salary-pay-rows-v4"], { revalidate: 3600 });

export async function getPayRows(market: Market = "US"): Promise<{ rows: PayRow[]; loadedAt: string }> {
  const { rows, loadedAt } = await loadCached(market);
  return { rows: rows.map(unpack), loadedAt };
}
