import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { normalizeAnnouncementBar } from "@/components/layout/announcement-bar";
import { AnnouncementBar } from "@/components/layout/announcement-bar-client";
import { getSiteSettings } from "@/lib/data/settings";
import { JsonLd, organizationJsonLd } from "@/components/seo/json-ld";
import { siteUrl } from "@/lib/seo";

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
  const settings = await getSiteSettings();
  const socialLinks = [
    settings.social_facebook,
    settings.social_linkedin,
    settings.social_youtube,
    settings.social_instagram,
  ].filter((url): url is string => Boolean(url));

  return (
    <>
      <JsonLd data={organizationJsonLd({ url: siteUrl(), phone: settings.phone, socialLinks })} />
      <AnnouncementBar settings={normalizeAnnouncementBar(settings.announcement_bar)} />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}

export default SiteLayout;
