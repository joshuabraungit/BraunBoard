// Import companies from a CSV and detect their ATS.
// Usage: npm run seed -- data/seed-companies.csv
// Columns: name,domain,careers_url,industry,employee_range (careers_url optional)

import { readFileSync } from "node:fs";
import { adminClient } from "../src/lib/supabase/admin";
import { detectByProbing, detectFromUrl } from "../src/lib/ingest/detect-ats";
import { slugify } from "../src/lib/slug";
import { fail, notice, requireEnv, warn } from "./report";

function parseCsv(text: string): Record<string, string>[] {
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const cols = header.split(",").map((c) => c.trim());
  return lines.filter(Boolean).map((line) => {
    const vals = line.split(",");
    return Object.fromEntries(cols.map((c, i) => [c, (vals[i] ?? "").trim()]));
  });
}

async function main() {
  const file = process.argv[2] ?? "data/seed-companies.csv";
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");
  const rows = parseCsv(readFileSync(file, "utf8"));
  const db = adminClient();

  // Check the key works before doing 40 rows of network probing.
  const ping = await db.from("companies").select("id", { count: "exact", head: true });
  if (ping.error) fail(new Error(`Can't reach Supabase with these secrets: ${ping.error.message}`));

  let detected = 0;
  const failures: string[] = [];

  for (const r of rows) {
    let found: Awaited<ReturnType<typeof detectByProbing>> = null;
    try {
      found = (r.careers_url && detectFromUrl(r.careers_url)) || (await detectByProbing(r.domain || r.name));
    } catch (e) {
      warn(`${r.name}: ATS detection failed (${(e as Error).message}); saved without an ATS`);
    }
    const domain = r.domain || null;
    const { error } = await db.from("companies").upsert(
      {
        slug: slugify(r.name),
        name: r.name,
        domain,
        website_url: domain ? `https://${domain}` : null,
        // Leave logo_url empty unless we have a real one; the UI resolves
        // favicon / domain logo service / initials at render time (src/lib/logo.ts).
        logo_url: null,
        industry: r.industry || null,
        employee_range: r.employee_range || null,
        careers_url: r.careers_url || null,
        ats_provider: found?.provider ?? null,
        ats_identifier: found?.identifier ?? null,
      },
      { onConflict: "slug" },
    );
    if (error) failures.push(`${r.name}: ${error.message}`);
    else console.log(`${r.name.padEnd(24)} ${found ? `${found.provider}/${found.identifier}` : "no supported ATS found"}`);
    if (found) detected++;
  }
  notice(`Seed: ${detected}/${rows.length} companies matched to Greenhouse, Lever or Ashby`);
  if (failures.length) fail(new Error(`${failures.length} companies failed to save. First: ${failures[0]}`));
}

main().catch(fail);
