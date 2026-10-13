// Loads every visible job's pay fields for the salary pages. Public data, so it uses a
// plain anon client (no cookies) and is cached for an hour across requests.
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "./supabase/server";
import { SAMPLE_JOBS } from "./sample-data";
import type { PayRow } from "./salaries";

const COLUMNS =
  "slug, title_raw, role_family, sales_segment, remote_type, city, state, salary_min, salary_max, ote_min, ote_max, company_name, company_slug, posted_at, currency, markets";

type Row = PayRow & { currency: string | null; markets: string[] | null };

async function load(): Promise<{ rows: Row[]; loadedAt: string }> {
  if (!isSupabaseConfigured()) {
    return { rows: SAMPLE_JOBS.map((j) => ({ ...j, posted_at: j.first_seen_at })) as unknown as Row[], loadedAt: new Date().toISOString() };
  }
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("visible_jobs").select(COLUMNS).order("id").range(from, from + 999);
    if (error) throw new Error(`salary data: ${error.message}`);
    rows.push(...((data ?? []) as unknown as Row[]));
    if (!data || data.length < 1000) break;
  }
  return { rows, loadedAt: new Date().toISOString() };
}

const loadCached = unstable_cache(load, ["salary-pay-rows-v2"], { revalidate: 3600 });

/**
 * Rows for one country's report. The US report is US roles paid in dollars; the UK report is
 * UK-only roles paid in pounds. Currencies are never mixed. Canada doesn't have its own yet.
 */
export async function getPayRows(market: "US" | "UK" = "US"): Promise<{ rows: PayRow[]; loadedAt: string }> {
  const { rows, loadedAt } = await loadCached();
  const keep =
    market === "UK"
      ? (r: Row) => (r.markets ?? []).includes("UK") && !(r.markets ?? []).includes("US") && (r.currency ?? "GBP") === "GBP"
      : (r: Row) => (r.currency ?? "USD") === "USD" && (r.markets ?? ["US"]).includes("US");
  return { rows: rows.filter(keep), loadedAt };
}
