// "What they sell": write (and fact-check) the plain-English story for companies that need one.
// A company needs one when it has never been checked, when the last check came back empty (after 2 days),
// when it posted new jobs since the last check (at most once a week), or when the story is more than a month old.
// Usage: npx tsx scripts/product-backfill.ts [max companies, default 40]

import { adminClient } from "../src/lib/supabase/admin";
import { extractCoreProduct, extractProduct, isCoreCompany, needsPlainRewrite } from "../src/lib/ingest/product";
import { fail, notice, requireEnv, warn } from "./report";

const DAY = 86_400_000;
const HOUR = 3_600_000;
// The current story template ("When... usually... The problem is... so..."). Older stories get rewritten in it.
const inTemplate = (story: string | null) => !!story && /^When\b/.test(story.trim()) && /\bThe problem is\b/.test(story);
// When the current template went live. A story last checked before this hasn't been tried in it yet.
const TEMPLATE_LIVE = Date.parse("2026-10-31T19:06:17Z");
// When the plain-English rules (no insider tech words, headlines say what it does) went live.
// Stories that break them get rewritten; if a rewrite doesn't come out clean, the old one stays.
// When main-product stories for big companies went live.
const CORE_LIVE = Date.parse("2026-11-01T21:00:00Z");
const PLAIN_LIVE = Date.parse("2026-11-01T19:40:00Z");

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
  const locked = new Set<string>();
  const meta = new Map<string, { size: string | null; source: string | null }>();
  const checked = new Map<string, { at: number | null; story: string | null; short: string | null }>();
  for (let i = 0; i < ids.length; i += 300) {
    const { data, error } = await db.from("companies").select("id, product_checked_at, product_story, product_short, product_locked, product_source, size_bucket").in("id", ids.slice(i, i + 300));
    if (error) throw error;
    // Written or approved by Josh in Admin: never rewritten.
    for (const c of data ?? []) if (c.product_locked) locked.add(c.id as string);
    for (const c of data ?? []) meta.set(c.id as string, { size: c.size_bucket as string | null, source: c.product_source as string | null });
    for (const c of data ?? []) checked.set(c.id as string, { at: c.product_checked_at ? new Date(c.product_checked_at as string).getTime() : null, story: c.product_story as string | null, short: c.product_short as string | null });
  }

  const now = Date.now();
  const due = ids
    .filter((id) => !locked.has(id))
    .map((id) => {
      const c = byCo.get(id)!;
      const at = checked.get(id)?.at ?? null;
      const noStory = !checked.get(id)?.story;
      // A check that came back empty is retried after 2 days, not left blank for a month.
      // Stories in an older format get rewritten in the current template (after new jobs, before stale ones),
      // right away the first time, then at most once a day if a rewrite doesn't stick.
      const oldFormat = !noStory && !inTemplate(checked.get(id)?.story ?? null) && (at! < TEMPLATE_LIVE || now - at! > DAY);
      const k = checked.get(id);
      // Big companies that sell many things get a main-product story instead of one posting's product.
      const core = isCoreCompany(meta.get(id)?.size, c.open);
      const notCore = core && meta.get(id)?.source !== "core" && (at == null || at < CORE_LIVE || now - at > 3 * HOUR);
      const notPlain = !noStory && needsPlainRewrite(k?.short ?? null, k?.story ?? null) && (at! < PLAIN_LIVE || now - at! > 3 * HOUR);
      const why = at == null ? 0 : noStory && now - at > 2 * DAY ? 0.5 : now - at > 30 * DAY ? 2 : c.newest > at && now - at > 7 * DAY ? 1 : notCore ? 1.3 : notPlain ? 1.4 : oldFormat ? 1.5 : null;
      return { id, c, why, core };
    })
    .filter((x) => x.why != null)
    // --core-only: just the big companies getting main-product stories.
    .filter((x) => !process.argv.includes("--core-only") || x.core)
    // Never-checked first, then companies with new jobs, then the oldest stories; bigger hirers first within each.
    .sort((a, b) => a.why! - b.why! || b.c.open - a.c.open)
    .slice(0, max);

  let stories = 0, changed = 0, errors = 0;
  let lastError = "";
  for (let i = 0; i < due.length; i += 5) {
    await Promise.all(
      due.slice(i, i + 5).map(async ({ id, c, core }) => {
        try {
          const r = core ? await extractCoreProduct(c.name, c.postings) : await extractProduct(c.name, c.postings);
          const prev = checked.get(id)?.story ?? null;
          const patch: Record<string, unknown> = { product_checked_at: new Date().toISOString() };
          // Only replace a story with a new one. If this pass couldn't write one, keep the last good one.
          if (r.story) {
            stories++;
            Object.assign(patch, { product_story: r.story, product_short: r.short, product_quote: r.quote, product_category: r.category, product_source: core ? "core" : "postings" });
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
