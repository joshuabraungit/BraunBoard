// Catch-up for jobs flagged "needs review" because the location didn't name a country.
// Reads each posting to find the country: ours gets listed there, abroad or unclear gets hidden.
// New jobs are checked by the crawler as they come in.
// Usage: npx tsx scripts/resolve-countries.ts [--dry-run]

import { adminClient } from "../src/lib/supabase/admin";
import { resolveCountry } from "../src/lib/ingest/country";
import { notice, requireEnv, warn } from "./report";

async function main() {
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY");
  const dry = process.argv.includes("--dry-run");
  const db = adminClient();
  const { data, error } = await db
    .from("jobs")
    .select("id, title_raw, location_raw, description_raw, companies(name)")
    .eq("is_active", true)
    .eq("needs_review", true)
    .limit(1000);
  if (error) throw error;
  const jobs = (data ?? []) as unknown as { id: string; title_raw: string; location_raw: string; description_raw: string | null; companies: { name: string } | null }[];

  const counts: Record<string, number> = {};
  let errors = 0;
  const queue = [...jobs];
  const lines: string[] = [];
  const worker = async () => {
    for (let j = queue.shift(); j; j = queue.shift()) {
      try {
        const r = await resolveCountry(j.title_raw, j.location_raw ?? "", j.description_raw ?? "");
        counts[r.country] = (counts[r.country] ?? 0) + 1;
        const ours = r.country !== "other" && r.country !== "unknown";
        lines.push(`${ours ? "list " : "hide "} ${r.country.padEnd(7)} ${j.companies?.name} · ${j.title_raw} · "${j.location_raw}"${r.evidence ? ` · because: "${r.evidence.slice(0, 90)}"` : ""}`);
        if (dry) continue;
        const patch: Record<string, unknown> = { needs_review: false, country_resolved: r.country, country_evidence: r.evidence };
        if (ours) Object.assign(patch, { country: r.country, markets: [r.country] });
        else Object.assign(patch, { is_active: false, removed_at: new Date().toISOString() });
        const { error: e } = await db.from("jobs").update(patch).eq("id", j.id);
        if (e) throw e;
      } catch (e) {
        errors++;
        warn(`${j.companies?.name} · ${j.title_raw}: ${(e as Error).message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  lines.sort();
  for (const l of lines) console.log(l);
  notice(`${dry ? "Dry run: " : ""}${jobs.length} jobs checked. ${Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(", ")}${errors ? `. ${errors} errors (still flagged)` : ""}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
