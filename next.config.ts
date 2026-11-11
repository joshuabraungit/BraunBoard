import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  // Lets an open tab tell when a newer deploy is live (see DeployCheck).
  env: { NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev" },
  // Résumé uploads on /for-you. Vercel caps a request at about 4.5MB.
  experimental: { serverActions: { bodySizeLimit: "4.5mb" } },
  // The kit PDF is gated, so it lives outside public/ and ships with the download route.
  outputFileTracingIncludes: { "/kit/download": ["./private/before-you-say-yes.pdf"] },
  // Same browser-security headers on every response (pages, static files, API). See security-headers.ts.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders({
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
          dev: process.env.NODE_ENV !== "production",
          preview: process.env.VERCEL_ENV === "preview",
        }),
      },
    ];
  },
  async redirects() {
    return [
      { source: "/level-3", destination: "/proof-page", permanent: true },
      // Old public link to the kit PDF. It's behind an email now.
      { source: "/kit/before-you-say-yes.pdf", destination: "/kit#get-kit", permanent: false },
      { source: "/examples/level-3.html", destination: "/examples/proof-page.html", permanent: true },
    ];
  },
};

export default nextConfig;
