import { NextResponse, type NextRequest } from "next/server";
import { guardAdminRequest, publicSlugIsResolvable } from "@/lib/auth";

// Next.js 16 renamed middleware.ts -> proxy.ts (see CLAUDE.md). Gates
// every /admin/* route except /admin/login behind an active
// admin_profiles row, and — new in Task 8 — fixes a real soft-404 bug
// for the app/(site)/[...slug] catch-all.
//
// THE SOFT-404 BUG (Task 8 item #8): app/(site)/loading.tsx gives every
// route under (site) an ambient Suspense boundary (Next's loading.js
// convention — see node_modules/next/dist/docs/01-app/03-api-reference/
// 03-file-conventions/loading.md's "Status Codes" section, read for this
// exact fix). The first time [...slug]/page.tsx's async body actually
// awaits something (getPageBySlug's DB round-trip), that boundary's
// fallback commits and starts streaming the response as 200 — headers
// are already sent by the time the page later calls notFound(), so the
// status can never become a real 404 afterward, even though
// not-found.tsx's content renders correctly (confirmed with
// `next build && next start` + curl, not just `next dev` — see
// task-8-report.md). The docs are explicit about the fix for a
// non-Cache-Components app: "ensure the resource exists before the
// response body is streamed... run this check in proxy". That's what
// this does, scoped to exactly the case the ticket names (the generic
// `pages`/`redirects`-backed catch-all) — not product/news/industry/
// application detail pages, which have the same theoretical exposure
// but are a pre-existing pattern predating this task and out of its
// explicit scope; see task-8-report.md's soft-404 section for that
// trade-off written out in full.
//
// THE FIX PRESERVES CHROME (Task 8 review fix — an earlier version of
// this hand-rolled a standalone, chrome-less 404 document here). On a
// confirmed-missing slug this rewrites the request to
// app/(site-404)/system-not-found instead — a sibling route group that
// reuses (site)'s exact layout/not-found content (see those files' own
// comments for how) but deliberately has NO loading.tsx anywhere in its
// tree, which is what fixes the status code: with no Suspense boundary
// anywhere in (site-404)'s tree, nothing can commit a 200 before
// system-not-found's unconditional notFound() call runs, so the final
// status really is 404 (verified against a real `next build && next
// start` server, not just reasoned about — see task-8-report.md).
//
// One nuance worth being explicit about, found the same way (a real
// server, not just the docs): with zero Suspense boundaries anywhere in
// the tree, Next's own notFound()-handling machinery
// (HTTPAccessFallbackBoundary) has no boundary to perform a server-side
// content swap into, so the raw HTTP response body is a minimal
// `id="__next_error__"` shell (confirmed via curl on a maximally
// trivial synthetic route too, in a real production build — this is
// NOT the "dev-mode Turbopack quirk" an earlier comment in
// tests/e2e/public-routes.spec.ts assumed it was) — the actual
// Header/Footer/"Page not found" content ships as an RSC payload the
// browser hydrates client-side. Confirmed with Playwright against the
// same built server that every real visitor still sees the full,
// correct, on-brand chrome (status 404, header/footer/heading all
// visible) — this is a real, if non-obvious, trade-off of this specific
// fix, not a defect in it.
//
// The rewrite is transparent to the browser (the URL bar keeps showing
// the original, nonexistent path), and — since proxy runs once per
// incoming request, not once per internal rewrite hop — doesn't
// re-invoke this function or re-run the existence check a second time.
//
// Only genuine top-level document navigations are affected — clicking a
// broken internal link while already on the site is a client-side RSC
// transition (detected below via the `RSC`/`Next-Router-Prefetch`
// request headers Next attaches to those) and continues to show the
// existing chrome'd not-found.tsx at (an irrelevant, not user-visible)
// 200, unchanged from before this fix.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    return guardAdminRequest(request);
  }

  return maybeRewriteToGenuine404(request);
}

// First-path-segments that are never handled by the [...slug] catch-all
// (each has its own literal route, or is a listing page with no
// notFound() call) — skipped entirely so this check never runs a query
// for a page it has no business judging. Detail routes nested under
// these (e.g. /products/:category/:slug, /news/:slug) are deliberately
// left alone too — see this file's top comment.
//
// Exported so a test can assert this stays in sync with the real
// app/(site)/ directory listing — this list already caused one real bug
// (a missing "resources" entry hard-404'd the real /resources route
// until caught by manually curling it against a live build). "styleguide"
// and "api" live outside app/(site)/ entirely, so a directory-listing
// test can't discover them and they're asserted by hand instead.
export const SKIPPED_TOP_SEGMENTS = new Set([
  "api",
  "preview",
  "products",
  "news",
  "industries",
  "applications",
  "resources",
  "search",
  "contact",
  "styleguide",
  // The rewrite target itself (app/(site-404)/system-not-found) — not a
  // real destination anyone links to, but skipped defensively so a
  // direct hit on it (or Next re-running proxy against the rewritten
  // request, if it ever does) can't loop back through this same check.
  "system-not-found",
]);

function isAssetPath(pathname: string): boolean {
  return (
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  );
}

async function maybeRewriteToGenuine404(request: NextRequest): Promise<NextResponse> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return NextResponse.next();
  }
  // Next's own client-side navigation/prefetch fetches — not a top-level
  // document load, so there's no HTTP status a user or crawler ever sees
  // for these, and rewriting one of these to a different page than the
  // client's router expects would break client-side routing.
  if (request.headers.get("RSC") || request.headers.get("Next-Router-Prefetch")) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  if (isAssetPath(pathname)) return NextResponse.next();

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return NextResponse.next(); // home
  if (SKIPPED_TOP_SEGMENTS.has(segments[0])) return NextResponse.next();

  const slug = segments.join("/");
  const exists = await publicSlugIsResolvable(slug);
  if (exists) return NextResponse.next();

  return NextResponse.rewrite(new URL("/system-not-found", request.url));
}

export const config = {
  matcher: ["/admin/:path*", "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api).*)"],
};
