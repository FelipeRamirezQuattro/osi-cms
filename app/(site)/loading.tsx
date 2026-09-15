import { PublicSkeleton } from "@/components/ui/public-primitives";

export default function SiteLoading() {
  return (
    <div
      className="mx-auto w-full max-w-[var(--site-container)] space-y-10 px-5 py-16 md:px-10"
      aria-label="Loading page"
      role="status"
    >
      <span className="sr-only">Loading page</span>
      <div aria-hidden className="max-w-3xl space-y-5">
        <div className="h-3 w-28 rounded-full bg-osi-sand-300/70 motion-safe:animate-pulse" />
        <div className="h-12 w-4/5 rounded-xl bg-osi-sand-300/60 motion-safe:animate-pulse" />
        <div className="h-4 w-full max-w-xl rounded-full bg-osi-sand-300/45 motion-safe:animate-pulse" />
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
        {[1, 2, 3].map((index) => (
          <PublicSkeleton key={index} lines={3} />
        ))}
      </div>
    </div>
  );
}
