import Link from "next/link";

// Root-level fallback only — paths under `/` normally hit
// app/(site)/not-found.tsx instead (rendered inside the Header/Footer
// chrome via the [...slug] catch-all's notFound()). This one has no DB
// access (root layout has none), so it can't render live nav — kept
// deliberately minimal but still on-brand.
export default function RootNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center bg-osi-navy-900 px-6 text-center text-osi-white">
      <p className="mb-4 font-display text-small-label tracking-wide-label text-osi-gold-500 uppercase">404</p>
      <h1 className="font-display text-section tracking-tightest-display uppercase">Page not found</h1>
      <Link
        href="/"
        className="mt-8 rounded-full border border-osi-white/70 px-6 py-2 font-display text-sm tracking-wide-display uppercase hover:border-osi-white hover:bg-osi-white/10"
      >
        Back to home
      </Link>
    </div>
  );
}
