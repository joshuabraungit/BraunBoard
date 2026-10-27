// Company size for the jobs filter. Sizes every hiring company that doesn't have one yet,
// and re-checks estimates every 90 days. Sizes set by an admin or a careers site are never touched.
// Usage: npx tsx scripts/size-backfill.ts [max companies, default 40]

import { adminClient } from "../src/lib/supabase/admin";
import { checkSize, extractSize } from "../src/lib/ingest/size";
import { fail, notice, requireEnv, warn } from "./report";

const DAY = 86_400_000;

async function main() {
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY");
  const max = Number(process.argv[2] ?? 40);
  // --retry-unknown: ask again about companies we couldn't size, however recently we tried.
  const retryUnknown = process.argv.includes("--retry-unknown");
  const db = adminClient();

  const byCo = new Map<string, { name: string; postings: string[] }>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("visible_jobs").select("company_id, company_name, description_raw").range(from, from + 999);
    if (error) throw error;
    for (const j of data ?? []) {
      const c = byCo.get(j.company_id) ?? { name: j.company_name as string, postings: [] };
      if (j.description_raw) c.postings.push(j.description_raw as string);
      byCo.set(j.company_id, c);
    }
    if ((data ?? []).length < 1000) break;
  }

  const ids = [...byCo.keys()];
  const due: string[] = [];
  for (let i = 0; i < ids.length; i += 300) {
    const { data, error } = await db.from("companies").select("id, size_bucket, size_source, size_checked_at").in("id", ids.slice(i, i + 300));
    if (error) throw error;
    for (const c of data ?? []) {
      if (c.size_source === "admin" || c.size_source === "careers" || c.size_source === "posting") continue;
      const at = c.size_checked_at ? new Date(c.size_checked_at as string).getTime() : null;
      if (at == null || Date.now() - at > 90 * DAY || (retryUnknown && !c.size_bucket)) due.push(c.id as string);
    }
  }
  const batch = due.slice(0, max);

  const tally = { posting: 0, estimate: 0, unknown: 0, errors: 0 };
  let lastError = "";
  for (let i = 0; i < batch.length; i += 5) {
    await Promise.all(
      batch.slice(i, i + 5).map(async (id) => {
        const c = byCo.get(id)!;
        try {
          const r = await extractSize(c.name, c.postings);
          const patch: Record<string, unknown> = { size_checked_at: new Date().toISOString() };
          if (r.bucket) Object.assign(patch, { size_bucket: r.bucket, size_source: r.source, size_quote: r.quote });
          tally[r.source ?? "unknown"]++;
          await db.from("companies").update(patch).eq("id", id);
        } catch (e) {
          tally.errors++;
          lastError = (e as Error).message;
        }
      }),
    );
  }
  // Sanity check every estimate against how many openings the company has right now.
  const { data: ests } = await db.from("companies").select("id, name, size_bucket, size_source, open_jobs_total").eq("size_source", "estimate");
  const moved: string[] = [];
  for (const c of ests ?? []) {
    const r = checkSize(c.size_bucket, c.size_source, c.open_jobs_total);
    if (r.changed) {
      await db.from("companies").update({ size_bucket: r.bucket }).eq("id", c.id);
      moved.push(`${c.name} (${c.open_jobs_total} openings)`);
    }
  }
  if (moved.length) notice(`Company size: moved up from startup to growth because of how many openings they have: ${moved.join(", ")}`);

  notice(`Company size: checked ${batch.length - tally.errors}. From postings ${tally.posting}, estimated ${tally.estimate}, unknown ${tally.unknown}${tally.errors ? `, ${tally.errors} errors (will retry)` : ""}. ${Math.max(0, due.length - batch.length)} still to do.`);
  if (tally.errors) warn(`Last size error: ${lastError}`);
}

main().catch(fail);
