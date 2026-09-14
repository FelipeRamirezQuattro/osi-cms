import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Without this, Next 16 dev mode silently drops client-side hydration
  // for any request whose origin isn't allow-listed — and 127.0.0.1
  // (Playwright's default baseURL, and how anyone opens the dev server by
  // IP instead of "localhost") isn't trusted by default. Found via
  // tests/e2e/navigation-links.spec.ts: every client component's onClick
  // was a dead no-op under `pnpm dev` at 127.0.0.1 until this was added
  // (confirmed directly — dispatching a native `click()` on a button's
  // DOM node still left its `aria-expanded` state unchanged). Real,
  // user-facing dev-mode breakage, not a testing-only workaround.
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    // Legacy Wix media host — see lib/media.ts and CLAUDE.md constraint 3.
    // Add hosts here (never `domains`, deprecated in Next 16) as content
    // migration surfaces more of them.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.wixstatic.com",
      },
      {
        // Supabase Storage — admin-uploaded media only (see lib/data/media.ts).
        protocol: "https",
        hostname: "ovuhuridnalxnzwggzru.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
