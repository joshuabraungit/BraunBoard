// Daily check that the live site works. Loads the pages people use most, plus one real job page,
// its preview card and the PDFs, and checks the job data is still being refreshed.
// Emails the admins only when something is wrong.
// Usage: npx tsx scripts/health-check.ts            (email on problems)
//        npx tsx scripts/health-check.ts --test     (always email, to check the email arrives)

import { adminClient } from "../src/lib/supabase/admin";
import { adminEmails } from "../src/lib/admin-emails";
import { sendEmail } from "../src/lib/alerts/email";
import { fail, notice, requireEnv, warn } from "./report";
import { runDataQa, type QaJob } from "../src/lib/data-qa";

const SITE = process.env.SITE_URL ?? "https://www.braunboard.com";
const HOUR = 3_600_000;
const HEALTH_CHECK_UA = "BraunBoard-HealthCheck";

interface Check { path: string; expect?: RegExp; type?: RegExp; cookie?: string }

async function load(c: Check): Promise<string | null> {
  const t0 = Date.now();
  try {
    const res = await fetch(SITE + c.path, { headers: { "user-agent": HEALTH_CHECK_UA, ...(c.cookie ? { cookie: c.cookie } : {}) }, signal: AbortSignal.timeout(30_000) });
    const ms = Date.now() - t0;
    if (!res.ok) return `${c.path} returned ${res.status}`;
    const type = res.headers.get("content-type") ?? "";
    if (c.type && !c.type.test(type)) return `${c.path} came back as ${type || "nothing"}`;
    if (c.expect) {
      const body = await res.text();
      if (!c.expect.test(body)) return `${c.path} loaded but is missing what it should show`;
    }
    if (ms > 15_000) return `${c.path} took ${Math.round(ms / 1000)} seconds to load`;
    return null;
  } catch (e) {
    return `${c.path} didn't load (${(e as Error).message})`;
  }
}

async function main() {
  requireEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");
  const test = process.argv.includes("--test");
  const db = adminClient();
  const problems: string[] = [];

  // One real, current job and its company, so we test the pages people actually land on.
  const { data: job } = await db.from("visible_jobs").select("slug, company_slug, title_raw").order("posted_at", { ascending: false }).limit(1).maybeSingle();

  const checks: Check[] = [
    { path: "/", expect: /Braun Board/ },
    { path: "/jobs", expect: /href="\/jobs\// },
    { path: "/new", expect: /Braun Board/ },
    { path: "/products", expect: /Braun Board/ },
    { path: "/kit", expect: /Before You Say Yes/ },
    { path: "/ask", expect: /Ask Josh/ },
    { path: "/report/october-2026", expect: /Job Market Report/ },
    { path: "/salaries", expect: /Braun Board/ },
    { path: "/picks", expect: /Picks/ },
    { path: "/login", expect: /Braun Board/ },
    { path: "/sitemap.xml", expect: /\/jobs\// },
    { path: "/robots.txt", expect: /Sitemap/i },
    { path: "/opengraph-image", type: /image\/png/ },
    // The kit is behind an email. The old PDF link should send people to the signup form,
    // and someone who signed up (has the kit cookie) should get the actual PDF.
    { path: "/kit/before-you-say-yes.pdf", expect: /Before You Say Yes/ },
    { path: "/kit/download", type: /pdf/, cookie: "bb_kit=1" },
    { path: "/report/braun-board-job-market-report-october-2026.pdf", type: /pdf/ },
  ];
  if (job) {
    checks.push(
      { path: `/jobs/${job.slug}`, expect: /application\/ld\+json/ },
      { path: `/jobs/${job.slug}/opengraph-image`, type: /image\/png/ },
      { path: `/company/${job.company_slug}`, expect: /Braun Board/ },
    );
  } else {
    problems.push("No live jobs found in the database");
  }

  for (const r of await Promise.all(checks.map(load))) if (r) problems.push(r);

  // The hourly crawler keeps jobs fresh. If nothing has been seen for 12 hours, it has stopped.
  const { data: seen } = await db.from("jobs").select("last_seen_at").order("last_seen_at", { ascending: false }).limit(1).maybeSingle();
  const age = seen?.last_seen_at ? Date.now() - new Date(seen.last_seen_at as string).getTime() : Infinity;
  if (age > 12 * HOUR) problems.push(`Jobs haven't been refreshed in ${Number.isFinite(age) ? Math.round(age / HOUR) + " hours" : "a long time"}. The hourly job may have stopped.`);

  const { count } = await db.from("visible_jobs").select("id", { count: "exact", head: true });
  if ((count ?? 0) < 500) problems.push(`Only ${count ?? 0} jobs are showing on the site. Usually it's over 2,000.`);

  // Data checks: pages can load fine while the jobs on them are wrong (wrong country, OTE shown as base...).
  const qaCols = "id, slug, title_raw, company_name, location_raw, markets, city, role_family, salary_max_usd, currency, salary_min, salary_max, first_seen_at, role_group";
  const jobs: QaJob[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from("visible_jobs").select(qaCols).order("id").range(from, from + 999);
    if (error) { problems.push(`Couldn't run the data checks: ${error.message}`); break; }
    jobs.push(...((data ?? []) as QaJob[]));
    if (!data || data.length < 1000) break;
  }
  // Descriptions only for new jobs (the German-language check), so this stays a small read.
  const since = new Date(Date.now() - 2 * 24 * HOUR).toISOString();
  // Descriptions for new jobs, plus older jobs with the same company and title (for the repost check).
  const newKeys = new Set(jobs.filter((j) => j.first_seen_at >= since).map((j) => `${j.company_name}|${j.title_raw.trim().toLowerCase()}`));
  const ids = jobs.filter((j) => j.first_seen_at >= since || newKeys.has(`${j.company_name}|${j.title_raw.trim().toLowerCase()}`)).map((j) => j.id);
  const desc = new Map<string, string | null>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await db.from("visible_jobs").select("id, description_raw").in("id", ids.slice(i, i + 200));
    for (const r of data ?? []) desc.set(r.id as string, r.description_raw as string | null);
  }
  for (const j of jobs) j.description_raw = desc.get(j.id) ?? null;
  const qa = jobs.length ? runDataQa(jobs) : [];
  for (const i of qa) problems.push([i.line, ...i.examples.map((e) => `   ${e}`)].join("\n"));

  const ok = problems.length === 0;
  notice(ok ? `Health check: all ${checks.length} pages fine, ${jobs.length} jobs pass the data checks, jobs refreshed ${Math.round(age / HOUR)}h ago, ${count} jobs live.` : `Health check found ${problems.length} problem(s): ${problems.join(" | ")}`);
  if (!ok || test) {
    const subject = ok ? "Braun Board health check: all good (test)" : `Braun Board: ${problems.length} problem${problems.length > 1 ? "s" : ""} on the site`;
    const lines = ok ? [`All ${checks.length} pages loaded fine and ${count} jobs are live.`] : problems;
    const text = `${ok ? "" : "The daily check found something wrong:\n\n"}${lines.map((l) => `- ${l}`).join("\n")}\n\nChecked ${SITE} at ${new Date().toUTCString()}.`;
    const html = `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#16140f">${ok ? "" : "<p>The daily check found something wrong:</p>"}<ul>${lines.map((l) => `<li>${l.replace(/</g, "&lt;").replace(/\n/g, "<br>")}</li>`).join("")}</ul><p style="color:#5b574e;font-size:13px">Checked ${SITE} at ${new Date().toUTCString()}.</p></div>`;
    for (const to of adminEmails()) {
      try {
        await sendEmail(to, { subject, html, text });
      } catch (e) {
        warn(`Couldn't email ${to}: ${(e as Error).message}`);
      }
    }
  }
  if (!ok) process.exitCode = 1;
}

main().catch(fail);
