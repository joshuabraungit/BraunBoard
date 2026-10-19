// Re-sort every company that has a story into the right product category, using the shared rules.
// Usage: npx tsx scripts/product-recategorize.ts
import { adminClient } from "../src/lib/supabase/admin";
import { classifyCategory } from "../src/lib/ingest/product";
import { fail, notice, requireEnv } from "./report";

async function main() {
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY");
  const db = adminClient();
  const { data, error } = await db.from("companies").select("id, name, product_story, product_quote, product_category").not("product_story", "is", null).limit(5000);
  if (error) throw error;
  const list = data ?? [];
  const moved: string[] = [];
  let errors = 0;
  for (let i = 0; i < list.length; i += 8) {
    await Promise.all(
      list.slice(i, i + 8).map(async (c) => {
        try {
          const cat = await classifyCategory(c.name as string, c.product_story as string, c.product_quote as string | null);
          if (cat && cat !== c.product_category) {
            await db.from("companies").update({ product_category: cat }).eq("id", c.id);
            moved.push(`${c.name}: ${c.product_category} -> ${cat}`);
          }
        } catch {
          errors++;
        }
      }),
    );
  }
  notice(`Re-sorted ${list.length} companies: ${moved.length} moved${errors ? `, ${errors} errors` : ""}.`);
  // Print the moves in chunks so they show up as readable notes on the run.
  for (let i = 0; i < moved.length; i += 25) notice(moved.slice(i, i + 25).join(" | "));
}

main().catch(fail);
