import { SiteLayout } from "@/app/(site)/layout";

// A sibling of app/(site)/ that exists for exactly one reason: to render
// a genuine 404 status with the real site chrome, for a request proxy.ts
// has already confirmed doesn't resolve to a `pages` row or a redirect
// (see proxy.ts's top comment for the full mechanism). Reuses (site)'s
// own layout component so the Header/Footer/announcement-bar chrome is
// identical, not a second copy that can drift.
//
// CRITICAL: this route group must NEVER get a loading.tsx. app/(site)/
// loading.tsx wrapping [...slug]/page.tsx in an ambient Suspense
// boundary is the entire root cause of the soft-404 bug this fix
// addresses — the moment that page's async body suspends under it, the
// response commits to streaming as 200 before notFound() ever runs.
// This route group's whole reason to exist is having NO such boundary,
// so system-not-found/page.tsx's unconditional notFound() call is the
// first thing that can settle the response, and it settles it as a real
// 404.
export const dynamic = "force-dynamic";

export default SiteLayout;
