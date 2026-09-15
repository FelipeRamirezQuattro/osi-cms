import { notFound } from "next/navigation";

// The rewrite target for proxy.ts's soft-404 fix — never linked to,
// never in the sitemap, not meant to be visited directly (though
// nothing breaks if it is; it would just 404 the same way). Its only
// job is to call notFound() unconditionally, with nothing above it in
// this route group's tree able to suspend under a Suspense boundary
// (see the layout in this route group for why that matters) — so this
// is the first thing that can settle the response, and it settles it as
// a real 404 with the real site chrome around it.
export default function ForceNotFoundPage() {
  notFound();
}
