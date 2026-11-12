// Tells Bing (and through IndexNow, Yandex, Naver, Seznam) which job pages are new or gone,
// so they show up in ChatGPT-style answers within hours instead of waiting for a crawl.
// Runs in the hourly job after the crawl. Usage: npx tsx scripts/indexnow.ts [hours back, default 2]
// The key file lives at public/<key>.txt so search engines can check the ping is really from us.

import { adminClient } from "../src/lib/supabase/admin";
import { notice, requireEnv, warn } from "./report";

const KEY = "64378b35d72c737295b04730ab464851";

async function main() {
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.braunboard.com").replace(/\/$/, "");
  const hours = Number(process.argv[2]) || 2;
  const since = new Date(Date.now() - hours * 3_600_000).toISOString();
  const db = adminClient();

  const [added, removed] = await Promise.all([
    db.from("visible_jobs").select("slug").gte("first_seen_at", since).limit(5000),
    db.from("jobs").select("slug").gte("removed_at", since).limit(5000),
  ]);
  if (added.error) throw added.error;
  if (removed.error) throw removed.error;

  const slugs = [...new Set([...(added.data ?? []), ...(removed.data ?? [])].map((r) => r.slug as string))];
  if (!slugs.length) return notice("IndexNow: nothing new or removed");
  const urlList = [`${site}/`, `${site}/jobs`, `${site}/new`, ...slugs.map((s) => `${site}/jobs/${s}`)];

  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: new URL(site).host, key: KEY, keyLocation: `${site}/${KEY}.txt`, urlList }),
  });
  // 200 and 202 both mean accepted. Anything else is worth a look, but never fails the hourly run.
  if (res.ok) notice(`IndexNow: sent ${urlList.length} pages (${added.data?.length ?? 0} new jobs, ${removed.data?.length ?? 0} removed)`);
  else warn(`IndexNow: ${res.status} ${(await res.text()).slice(0, 200)}`);
}

main().catch((e) => warn(`IndexNow skipped: ${e instanceof Error ? e.message : String(e)}`));
