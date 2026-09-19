import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { normalizeAnnouncementBar } from "@/components/layout/announcement-bar";
import { AnnouncementBar } from "@/components/layout/announcement-bar-client";
import { PublicThemeBoundary } from "@/components/branding/public-theme-boundary";
import { resolvePublishedBranding } from "@/lib/branding/resolve";
import { resolveDraftBranding } from "@/lib/branding/resolve";
import { getSiteSettings } from "@/lib/data/settings";
import { getMediaAssetById } from "@/lib/data/media";
import { headers } from "next/headers";
import { JsonLd, organizationJsonLd } from "@/components/seo/json-ld";
import { siteUrl } from "@/lib/seo";
import { AnalyticsBeacon } from "@/components/analytics/analytics-beacon";

// Every route here reads live, draft/published-gated content straight
// from Supabase (and lib/db/client.ts touches cookies() for session
// handling) — cacheComponents is intentionally off (see CLAUDE.md), so
// force dynamic rendering rather than let Next attempt to statically
// prerender pages whose content can change via the admin at any time.
export const dynamic = "force-dynamic";

// Wraps every public marketing page with the site chrome. Deliberately
// excludes /styleguide (isolated design reference) and the future
// /admin (Phase 5) — those live outside this route group.
//
// Exported by name (not just default) so app/(site-404)/layout.tsx — the
// chrome-preserving genuine-404 route proxy.ts rewrites a confirmed-
// missing slug to (see that file's top comment) — can reuse this exact
// component. That sibling route group needs the identical Header/
// Footer/announcement-bar chrome but, critically, must NOT have a
// sibling loading.tsx: that absence (not anything about this function)
// is what lets it commit a real 404 status, so the reuse only covers
// this layout, not the whole route group.
export async function SiteLayout({ children }: { children: React.ReactNode }) {
  const requestHeaders = await headers();
  const isDraftPreview = requestHeaders.get("x-osi-branding-preview") === "draft";
  const [settings, branding] = await Promise.all([getSiteSettings(), isDraftPreview ? resolveDraftBranding() : resolvePublishedBranding()]);
  const logoAsset = branding.config.logo.mediaAssetId ? await getMediaAssetById(branding.config.logo.mediaAssetId) : null;
  const socialLinks = [
    settings.social_facebook,
    settings.social_linkedin,
    settings.social_youtube,
    settings.social_instagram,
  ].filter((url): url is string => Boolean(url));

  return (
    <PublicThemeBoundary branding={branding} className="flex min-h-dvh flex-1 flex-col">
      <JsonLd data={organizationJsonLd({ url: siteUrl(), phone: settings.phone, socialLinks })} />
      <AnalyticsBeacon />
      {/*
       * Skip link (Task 14) — invisible until it receives keyboard focus
       * (first Tab stop on every page), then it's the first thing a
       * keyboard/screen-reader user sees, letting them jump straight past
       * the announcement bar/header/mega-menu to the actual page content
       * instead of tabbing through the same site chrome on every single
       * page load.
       */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded focus:bg-brand-surface-dark focus:px-4 focus:py-2 focus:text-sm focus:text-brand-text-dark"
      >
        Skip to main content
      </a>
      <AnnouncementBar settings={normalizeAnnouncementBar(settings.announcement_bar)} />
      <Header branding={branding.config} logoAsset={logoAsset} />
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <Footer branding={branding.config} logoAsset={logoAsset} />
    </PublicThemeBoundary>
  );
}

export default SiteLayout;
