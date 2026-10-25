// "What they sell": write (and fact-check) the plain-English story for companies that need one.
// A company needs one when it has never been checked, when the last check came back empty (after 2 days),
// when it posted new jobs since the last check (at most once a week), or when the story is more than a month old.
// Usage: npx tsx scripts/product-backfill.ts [max companies, default 40]

import { adminClient } from "../src/lib/supabase/admin";
import { extractProduct } from "../src/lib/ingest/product";
import { fail, notice, requireEnv, warn } from "./report";

const DAY = 86_400_000;

async function main() {
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY");
  const max = Number(process.argv[2] ?? 40);
  const db = adminClient();

  // Every live posting, grouped by company. Paged because a select returns at most 1,000 rows.
  const byCo = new Map<string, { name: string; postings: string[]; newest: number; open: number }>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("visible_jobs")
      .select("company_id, company_name, description_raw, posted_at")
      .not("description_raw", "is", null)
      .range(from, from + 999);
    if (error) throw error;
    for (const j of data ?? []) {
      const c = byCo.get(j.company_id) ?? { name: j.company_name as string, postings: [], newest: 0, open: 0 };
      c.postings.push(j.description_raw as string);
      c.newest = Math.max(c.newest, new Date(j.posted_at as string).getTime());
      c.open++;
      byCo.set(j.company_id, c);
    }
    if ((data ?? []).length < 1000) break;
  }

  const ids = [...byCo.keys()];
  const checked = new Map<string, { at: number | null; story: string | null }>();
  for (let i = 0; i < ids.length; i += 300) {
    const { data, error } = await db.from("companies").select("id, product_checked_at, product_story").in("id", ids.slice(i, i + 300));
    if (error) throw error;
    for (const c of data ?? []) checked.set(c.id as string, { at: c.product_checked_at ? new Date(c.product_checked_at as string).getTime() : null, story: c.product_story as string | null });
  }

  const now = Date.now();
  const due = ids
    .map((id) => {
      const c = byCo.get(id)!;
      const at = checked.get(id)?.at ?? null;
      const noStory = !checked.get(id)?.story;
      // A check that came back empty is retried after 2 days, not left blank for a month.
      const why = at == null ? 0 : noStory && now - at > 2 * DAY ? 0.5 : now - at > 30 * DAY ? 2 : c.newest > at && now - at > 7 * DAY ? 1 : null;
      return { id, c, why };
    })
    .filter((x) => x.why != null)
    // Never-checked first, then companies with new jobs, then the oldest stories; bigger hirers first within each.
    .sort((a, b) => a.why! - b.why! || b.c.open - a.c.open)
    .slice(0, max);

  let stories = 0, changed = 0, errors = 0;
  let lastError = "";
  for (let i = 0; i < due.length; i += 5) {
    await Promise.all(
      due.slice(i, i + 5).map(async ({ id, c }) => {
        try {
          const r = await extractProduct(c.name, c.postings);
          const prev = checked.get(id)?.story ?? null;
          const patch: Record<string, unknown> = { product_checked_at: new Date().toISOString() };
          // Only replace a story with a new one. If this pass couldn't write one, keep the last good one.
          if (r.story) {
            stories++;
            Object.assign(patch, { product_story: r.story, product_short: r.short, product_quote: r.quote, product_category: r.category });
            if (r.story !== prev) {
              patch.product_changed_at = new Date().toISOString();
              changed++;
            }
          }
          await db.from("companies").update(patch).eq("id", id);
        } catch (e) {
          // Left as is, so the next run tries again.
          errors++;
          lastError = (e as Error).message;
        }
      }),
    );
  }
  notice(`What they sell: checked ${due.length - errors} companies, story for ${stories}, ${changed} new or changed${errors ? `, ${errors} errors (will retry)` : ""}. ${Math.max(0, ids.length - due.length)} others are up to date.`);
  if (errors) warn(`Last product story error: ${lastError}`);
}

main().catch(fail);
