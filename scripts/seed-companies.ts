// Import companies from a CSV and detect their ATS.
// Usage: npm run seed -- data/seed-companies.csv
// Columns: name,domain,careers_url,industry,employee_range (careers_url optional)

import { readFileSync } from "node:fs";
import { adminClient } from "../src/lib/supabase/admin";
import { detectByProbing, detectFromUrl } from "../src/lib/ingest/detect-ats";
import { slugify } from "../src/lib/slug";

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
  const rows = parseCsv(readFileSync(file, "utf8"));
  const db = adminClient();
  let detected = 0;

  for (const r of rows) {
    const found = (r.careers_url && detectFromUrl(r.careers_url)) || (await detectByProbing(r.domain || r.name));
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
    if (error) console.error(`${r.name}: ${error.message}`);
    else console.log(`${r.name.padEnd(24)} ${found ? `${found.provider}/${found.identifier}` : "no supported ATS found"}`);
    if (found) detected++;
  }
  console.log(`\n${detected}/${rows.length} companies on Greenhouse, Lever or Ashby`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
