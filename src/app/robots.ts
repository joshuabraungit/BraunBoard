import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.braunboard.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/auth/", "/r/", "/watchlist", "/alerts", "/login"] },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
