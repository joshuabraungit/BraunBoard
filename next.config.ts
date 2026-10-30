import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Résumé uploads on /for-you. Vercel caps a request at about 4.5MB.
  experimental: { serverActions: { bodySizeLimit: "4.5mb" } },
  async redirects() {
    return [
      { source: "/level-3", destination: "/proof-page", permanent: true },
      { source: "/examples/level-3.html", destination: "/examples/proof-page.html", permanent: true },
    ];
  },
};

export default nextConfig;
