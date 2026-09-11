import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Legacy Wix media host — see lib/media.ts and CLAUDE.md constraint 3.
    // Add hosts here (never `domains`, deprecated in Next 16) as content
    // migration surfaces more of them.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.wixstatic.com",
      },
    ],
  },
};

export default nextConfig;
