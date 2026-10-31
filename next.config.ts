import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Résumé uploads on /for-you. Vercel caps a request at about 4.5MB.
  experimental: { serverActions: { bodySizeLimit: "4.5mb" } },
  // The kit PDF is gated, so it lives outside public/ and ships with the download route.
  outputFileTracingIncludes: { "/kit/download": ["./private/before-you-say-yes.pdf"] },
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
