// Catch-up: a 2-3 word "Sells to" label for every buyer line. New ones get it as they're found.
// Each distinct buyer line is shortened once and written to every job that has it.
// Usage: npx tsx scripts/buyer-short-backfill.ts [--dry-run]

import { adminClient } from "../src/lib/supabase/admin";
import { shortBuyer } from "../src/lib/ingest/buyer-plain";
import { notice, requireEnv, warn } from "./report";

async function main() {
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY");
  const dry = process.argv.includes("--dry-run");
  const db = adminClient();
  const buyers = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("jobs").select("buyer").eq("is_active", true).not("buyer", "is", null).is("buyer_short", null).order("id").range(from, from + 999);
    if (error) throw error;
    for (const r of data ?? []) buyers.add(r.buyer as string);
    if (!data || data.length < 1000) break;
  }
  let done = 0;
  let errors = 0;
  const queue = [...buyers];
  const worker = async () => {
    for (let b = queue.shift(); b; b = queue.shift()) {
      try {
        const short = await shortBuyer(b);
        console.log(`${(short ?? "(none)").padEnd(28)} <- ${b}`);
        if (!short) continue;
        done++;
        if (dry) continue;
        const { error } = await db.from("jobs").update({ buyer_short: short }).eq("buyer", b);
        if (error) throw error;
      } catch (e) {
        errors++;
        warn(`${b}: ${(e as Error).message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  notice(`${dry ? "Dry run: " : ""}${buyers.size} buyer lines, ${done} short labels${errors ? `, ${errors} errors` : ""}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
