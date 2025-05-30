import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Disable prefetching on hover
    optimisticClientCache: false,
  },
  // Add headers to discourage bots and crawlers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, nosnippet, noarchive, noimageindex",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=86400, s-maxage=86400", // Cache for 24 hours
          },
        ],
      },
    ];
  },
};

export default nextConfig;
