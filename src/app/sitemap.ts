import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { allSalaryPages } from "@/lib/salaries";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { SAMPLE_COMPANIES, SAMPLE_JOBS } from "@/lib/sample-data";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.braunboard.com";

// Rebuilt at most once an hour, so new jobs show up for Google without a database read on every visit.
export const revalidate = 3600;

interface Row { slug: string; posted_at: string; company_slug: string }

/** Every live job, with its company. Paged because one read returns at most 1,000 rows. */
async function liveJobs(): Promise<Row[]> {
  if (!isSupabaseConfigured()) {
    return SAMPLE_JOBS.map((j) => ({ slug: j.slug, posted_at: j.first_seen_at, company_slug: j.company_slug }));
  }
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const out: Row[] = [];
  for (let from = 0; from < 50_000; from += 1000) {
    const { data, error } = await db.from("visible_jobs").select("slug, posted_at, company_slug").order("posted_at", { ascending: false }).range(from, from + 999);
    if (error) break;
    out.push(...((data ?? []) as Row[]));
    if ((data ?? []).length < 1000) break;
  }
  return out;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const jobs = await liveJobs().catch(() => [] as Row[]);

  // A company page changes when it posts a job, so its date is its newest posting.
  const companies = new Map<string, Date>();
  for (const j of jobs) {
    const d = new Date(j.posted_at);
    const cur = companies.get(j.company_slug);
    if (!cur || d > cur) companies.set(j.company_slug, d);
  }
  if (!isSupabaseConfigured()) for (const c of SAMPLE_COMPANIES) if (!companies.has(c.slug)) companies.set(c.slug, now);

  return [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE}/jobs`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE}/new`, lastModified: now, changeFrequency: "hourly", priority: 0.7 },
    { url: `${SITE}/products`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE}/employers`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/salaries`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE}/salaries/uk`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE}/outreach`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/cold-call`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/proof-page`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/kit`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/report/october-2026`, lastModified: new Date("2026-10-24"), changeFrequency: "yearly", priority: 0.7 },
    { url: `${SITE}/ask`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/picks`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    ...allSalaryPages().map((p) => ({ url: `${SITE}/salaries/${p.slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.8 })),
    ...[...companies].map(([slug, d]) => ({ url: `${SITE}/company/${slug}`, lastModified: d, changeFrequency: "daily" as const, priority: 0.6 })),
    ...jobs.map((j) => ({ url: `${SITE}/jobs/${j.slug}`, lastModified: new Date(j.posted_at), changeFrequency: "daily" as const, priority: 0.7 })),
  ];
}
