// Tailored to the product detail page's actual shape (hero, benefits
// grid, stages, spec table) — this route is one of the two Lighthouse
// targets in the master prompt's hardening phase, worth a real skeleton
// rather than the generic (site) fallback.
export default function ProductDetailLoading() {
  return (
    <div className="animate-pulse" aria-hidden>
      <div className="bg-osi-navy-900 px-6 py-24 md:px-12">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 md:grid-cols-2 md:items-center">
          <div className="space-y-4">
            <div className="h-3 w-24 rounded bg-white/20" />
            <div className="h-10 w-3/4 rounded bg-white/20" />
            <div className="h-4 w-full rounded bg-white/10" />
            <div className="h-4 w-5/6 rounded bg-white/10" />
          </div>
          <div className="aspect-square rounded bg-white/10" />
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-6 py-16 md:px-12">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded bg-osi-sand-300/40" />
          ))}
        </div>
      </div>
    </div>
  );
}
