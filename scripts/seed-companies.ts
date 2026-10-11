// Import companies from a CSV and detect their ATS.
// Usage: npm run seed -- data/seed-companies.csv
// Columns: name,domain,careers_url,industry,employee_range (careers_url optional)
//
// A careers_url pins the ATS exactly. Without one we guess board names and only
// keep a guess we can verify belongs to this company (see detect-ats.ts).

import { readFileSync } from "node:fs";
import { adminClient } from "../src/lib/supabase/admin";
import { detectByProbing, detectFromUrl, type ProbeResult } from "../src/lib/ingest/detect-ats";
import { slugify } from "../src/lib/slug";
import { fail, notice, requireEnv, warn } from "./report";

function parseCsv(text: string): Record<string, string>[] {
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const cols = header.split(",").map((c) => c.trim());
  return lines
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((line) => {
      const vals = line.split(",");
      return Object.fromEntries(cols.map((c, i) => [c, (vals[i] ?? "").trim()]));
    });
}

async function main() {
  const file = process.argv[2] ?? "data/seed-companies.csv";
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");
  const rows = parseCsv(readFileSync(file, "utf8"));
  const db = adminClient();

  // Check the key works before doing a lot of network probing.
  const ping = await db.from("companies").select("id", { count: "exact", head: true });
  if (ping.error) fail(new Error(`Can't reach Supabase with these secrets: ${ping.error.message}`));

  const matched: string[] = [];
  const unverified: string[] = [];
  const missing: string[] = [];
  const failures: string[] = [];
  const seenBoards = new Set<string>();

  const queue = [...rows];
  const worker = async () => {
    for (let r = queue.shift(); r; r = queue.shift()) {
      const domain = r.domain || null;
      let found: ProbeResult | null = null;
      try {
        const pinned = r.careers_url ? detectFromUrl(r.careers_url) : null;
        found = pinned ? { ...pinned, verified: true } : await detectByProbing(r.name, domain);
      } catch (e) {
        warn(`${r.name}: ATS detection failed (${(e as Error).message})`);
      }
      // Two companies can't share one board.
      const boardKey = found ? `${found.provider}/${found.identifier}` : "";
      if (found?.verified && seenBoards.has(boardKey)) found = { ...found, verified: false };
      if (found?.verified) seenBoards.add(boardKey);

      const ok = !!found?.verified;
      const { data, error } = await db
        .from("companies")
        .upsert(
          {
            slug: slugify(r.name),
            name: r.name,
            domain,
            website_url: domain ? `https://${domain}` : null,
            // logo_url stays empty; the UI resolves favicon / logo service / initials (src/lib/logo.ts).
            industry: r.industry || null,
            employee_range: r.employee_range || null,
            careers_url: r.careers_url || null,
            ats_provider: ok ? found!.provider : null,
            ats_identifier: ok ? found!.identifier : null,
          },
          { onConflict: "slug" },
        )
        .select("id")
        .single();
      if (error) {
        failures.push(`${r.name}: ${error.message}`);
        continue;
      }
      if (ok) matched.push(r.name);
      else {
        // Company lost its board (or never had one): its jobs can't be refreshed, so hide them.
        await db.from("jobs").update({ is_active: false, removed_at: new Date().toISOString() }).eq("company_id", data.id).eq("is_active", true);
        if (found) unverified.push(`${r.name} (${found.provider}/${found.identifier})`);
        else missing.push(r.name);
      }
      console.log(`${r.name.padEnd(28)} ${ok ? boardKey : found ? `UNVERIFIED ${boardKey}` : "no supported ATS found"}`);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));

  notice(`Seed: ${matched.length}/${rows.length} companies verified on Greenhouse, Lever or Ashby`);
  if (unverified.length) notice(`Boards found but not confirmed as the same company (skipped): ${unverified.join(", ")}`);
  if (missing.length) notice(`No supported ATS found: ${missing.join(", ")}`);
  if (failures.length) fail(new Error(`${failures.length} companies failed to save. First: ${failures[0]}`));
}

main().catch(fail);
