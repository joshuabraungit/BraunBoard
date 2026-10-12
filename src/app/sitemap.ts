import type { MetadataRoute } from "next";
import { allSalaryPages } from "@/lib/salaries";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.braunboard.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE}/jobs`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE}/companies`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE}/salaries`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE}/picks`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    ...allSalaryPages().map((p) => ({ url: `${SITE}/salaries/${p.slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.8 })),
  ];
}
