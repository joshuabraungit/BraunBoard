import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/level-3", destination: "/proof-page", permanent: true },
      { source: "/examples/level-3.html", destination: "/examples/proof-page.html", permanent: true },
    ];
  },
};

export default nextConfig;
