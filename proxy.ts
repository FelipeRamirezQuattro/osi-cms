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
// This intentionally returns a plain, standalone 404 document instead of
// reusing not-found.tsx's chrome-wrapped rendering: there is no way to
// both (a) get Next to commit a real 404 status and (b) let the normal
// Header/Footer-wrapped React tree render, because the moment that tree
// is asked to render at all it re-enters the same ambient Suspense
// boundary this bug comes from. Only genuine top-level document
// navigations are affected — clicking a broken internal link while
// already on the site is a client-side RSC transition (detected below
// via the `RSC`/`Next-Router-Prefetch` request headers Next attaches to
// those) and continues to show the existing chrome'd not-found.tsx at
// (an irrelevant, not user-visible) 200, unchanged from before this fix.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    return guardAdminRequest(request);
  }

  return maybeServeGenuine404(request);
}

// First-path-segments that are never handled by the [...slug] catch-all
// (each has its own literal route, or is a listing page with no
// notFound() call) — skipped entirely so this check never runs a query
// for a page it has no business judging. Detail routes nested under
// these (e.g. /products/:category/:slug, /news/:slug) are deliberately
// left alone too — see this file's top comment.
const SKIPPED_TOP_SEGMENTS = new Set([
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
]);

function isAssetPath(pathname: string): boolean {
  return (
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  );
}

async function maybeServeGenuine404(request: NextRequest): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return NextResponse.next();
  }
  // Next's own client-side navigation/prefetch fetches — not a top-level
  // document load, so there's no HTTP status a user or crawler ever sees
  // for these, and returning a plain HTML document here instead of the
  // RSC Flight payload they expect would break client-side routing.
  if (request.headers.get("RSC") || request.headers.get("Next-Router-Prefetch")) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  if (isAssetPath(pathname)) return NextResponse.next();

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return NextResponse.next(); // home
  if (SKIPPED_TOP_SEGMENTS.has(segments[0])) return NextResponse.next();

  const slug = segments.join("/");
  const exists = await publicSlugIsResolvable(request, slug);
  if (exists) return NextResponse.next();

  return genuineNotFoundResponse();
}

function genuineNotFoundResponse(): Response {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<!--
  Title deliberately matches app/layout.tsx's bare, untemplated default
  ("Odessa Separator Inc.", no "X | " prefix) rather than something more
  descriptive like "Page not found" — tests/e2e/navigation-links.spec.ts
  detects a broken nav link precisely by that bare-default-title signal
  (a real page's generateMetadata always produces a templated title), and
  this response bypasses Next's rendering/metadata pipeline entirely, so
  it has to reproduce that signal by hand to keep that detection working
  for every href this fix now intercepts. The <h1> below (not <title>) is
  what carries the human-readable "Page not found" message.
-->
<title>Odessa Separator Inc.</title>
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#001B33;color:#F2E9DE;font-family:Georgia,serif;text-align:center;padding:24px;}
p.eyebrow{letter-spacing:.2em;text-transform:uppercase;color:#E2902A;font-size:.75rem;margin:0 0 1rem;}
a{color:#E2902A;}
</style>
</head>
<body>
<div>
<p class="eyebrow">404</p>
<h1>Page not found</h1>
<p>The page you&rsquo;re looking for doesn&rsquo;t exist or may have moved.</p>
<p><a href="/">Back to home</a> &middot; <a href="/search">Search the site</a></p>
</div>
</body>
</html>`;
  return new Response(html, { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });
}

export const config = {
  matcher: ["/admin/:path*", "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api).*)"],
};
