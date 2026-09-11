// Generic skeleton shown while any (site) route's async data fetch is
// in flight — Next.js swaps this in automatically per the loading.tsx
// convention. Deliberately backgroundless/borderless shapes rather than
// a literal copy of any one page, since this covers every route under
// (site) that doesn't define its own more specific loading.tsx (see
// products/[category]/[slug]/loading.tsx for a tailored one).
export default function SiteLoading() {
  return (
    <div className="animate-pulse space-y-10 px-6 py-16 md:px-12" aria-hidden>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="h-4 w-32 rounded bg-osi-sand-300/60" />
        <div className="h-10 w-2/3 rounded bg-osi-sand-300/60" />
        <div className="h-4 w-full max-w-xl rounded bg-osi-sand-300/40" />
      </div>
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 rounded bg-osi-sand-300/40" />
        ))}
      </div>
    </div>
  );
}
