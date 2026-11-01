// "What you'd do" in plain English for jobs that don't have it yet. New jobs get it when they're
// crawled; this catches up stored jobs and retries ones where the AI call failed.
// Usage: npx tsx scripts/role-plain-backfill.ts [max jobs, default 500]

import { adminClient } from "../src/lib/supabase/admin";
import { plainRole } from "../src/lib/ingest/role-plain";
import { fail, notice, requireEnv, warn } from "./report";

async function main() {
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY");
  const max = Number(process.argv[2] ?? 500);
  const db = adminClient();
  // Newest first, so what people see first gets done first. Paged: a select returns at most 1,000 rows.
  const ids: string[] = [];
  for (let from = 0; ids.length < max; from += 1000) {
    const { data, error } = await db
      .from("visible_jobs")
      .select("id")
      .is("role_plain", null)
      .not("description_raw", "is", null)
      .order("posted_at", { ascending: false })
      .order("id")
      .range(from, from + 999);
    if (error) throw error;
    ids.push(...(data ?? []).map((r) => r.id as string));
    if ((data ?? []).length < 1000) break;
  }
  // Skip ones already tried today; they get another go tomorrow.
  const due: { id: string; title_raw: string; description_raw: string }[] = [];
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  for (let i = 0; i < ids.length && due.length < max; i += 200) {
    const { data, error } = await db
      .from("jobs")
      .select("id, title_raw, description_raw, role_plain_checked_at")
      .in("id", ids.slice(i, i + 200));
    if (error) throw error;
    for (const j of data ?? []) if (!j.role_plain_checked_at || j.role_plain_checked_at < dayAgo) due.push(j as never);
  }

  let written = 0, empty = 0, errors = 0;
  let lastError = "";
  const queue = due.slice(0, max);
  const worker = async () => {
    for (let j = queue.shift(); j; j = queue.shift()) {
      try {
        const plain = await plainRole(j.title_raw, j.description_raw);
        await db.from("jobs").update({ role_plain: plain, role_plain_checked_at: new Date().toISOString() }).eq("id", j.id);
        if (plain) written++;
        else empty++;
      } catch (e) {
        errors++;
        lastError = (e as Error).message;
      }
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  notice(`What you'd do: wrote ${written}, nothing clean for ${empty}${errors ? `, ${errors} errors (will retry)` : ""}. ${Math.max(0, ids.length - due.length)} waiting for tomorrow's retry.`);
  if (errors) warn(`Last error: ${lastError}`);
}

main().catch(fail);
