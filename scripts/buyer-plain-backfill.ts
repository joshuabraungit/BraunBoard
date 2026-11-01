// Catch-up: rewrite buyer lines that use shorthand ("CISOs", "AI/ML teams") in plain words.
// New buyer lines are rewritten as they're found. Each distinct line is rewritten once.
// Usage: npx tsx scripts/buyer-plain-backfill.ts [--dry-run]

import { adminClient } from "../src/lib/supabase/admin";
import { buyerJargonIn, plainBuyer } from "../src/lib/ingest/buyer-plain";
import { notice, requireEnv, warn } from "./report";

async function main() {
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY");
  const dry = process.argv.includes("--dry-run");
  const db = adminClient();
  const buyers = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("jobs").select("buyer").eq("is_active", true).not("buyer", "is", null).order("id").range(from, from + 999);
    if (error) throw error;
    for (const r of data ?? []) buyers.add(r.buyer as string);
    if (!data || data.length < 1000) break;
  }
  const todo = [...buyers].filter((b) => buyerJargonIn(b).length);
  let changed = 0;
  let errors = 0;
  const queue = [...todo];
  const worker = async () => {
    for (let b = queue.shift(); b; b = queue.shift()) {
      try {
        const plain = await plainBuyer(b);
        if (plain === b) {
          console.log(`kept      ${b}`);
          continue;
        }
        changed++;
        console.log(`rewrote   ${b}  ->  ${plain}`);
        if (dry) continue;
        const { error } = await db.from("jobs").update({ buyer: plain }).eq("buyer", b);
        if (error) throw error;
      } catch (e) {
        errors++;
        warn(`${b}: ${(e as Error).message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  notice(`${dry ? "Dry run: " : ""}${buyers.size} buyer lines, ${todo.length} with shorthand, ${changed} rewritten${errors ? `, ${errors} errors` : ""}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
