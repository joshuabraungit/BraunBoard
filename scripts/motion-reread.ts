// Second read for quota roles (AE, AM, SDR, Customer Expansion) still marked hunter/farmer Unknown.
// Usage: npx tsx scripts/motion-reread.ts [--dry-run]

import { adminClient } from "../src/lib/supabase/admin";
import { rereadMotion } from "../src/lib/ingest/motion-reread";
import { requireEnv } from "./report";

const LABEL: Record<string, string> = { "New Logo": "Hunter", Expansion: "Farmer", Mixed: "Both" };

async function main() {
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY");
  const dry = process.argv.includes("--dry-run");
  const db = adminClient();
  const { data, error } = await db
    .from("visible_jobs")
    .select("id, title_raw, company_name, description_raw")
    .eq("sales_motion", "Unknown")
    .in("role_family", ["Account Executive", "Account Manager", "Customer Expansion", "SDR/BDR"]);
  if (error) throw error;
  let tagged = 0;
  for (const j of data ?? []) {
    const r = await rereadMotion(j.title_raw as string, (j.description_raw as string) ?? "", process.env.ANTHROPIC_API_KEY!).catch((e) => {
      console.log(`  error · ${j.company_name} · ${j.title_raw} · ${e}`);
      return null;
    });
    if (!r || r.motion === "Unknown") {
      console.log(`  still not stated · ${j.company_name} · ${j.title_raw}${dry && r?.raw && !/Not stated/.test(r.raw) ? ` · model said: ${r.raw.replace(/\s+/g, " ").slice(0, 300)}` : ""}`);
      continue;
    }
    tagged++;
    console.log(`  ${LABEL[r.motion]} · ${j.company_name} · ${j.title_raw} · "${r.evidence}"`);
    if (dry) continue;
    const { error: ue } = await db.from("jobs").update({ sales_motion: r.motion }).eq("id", j.id).eq("classification_overridden", false);
    if (ue) throw ue;
  }
  console.log(`${tagged} of ${(data ?? []).length} now tagged${dry ? " (dry run, nothing saved)" : ""}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
