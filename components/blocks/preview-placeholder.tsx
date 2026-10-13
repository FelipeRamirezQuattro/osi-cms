/**
 * A staff-only stand-in for a block that renders nothing on the live site
 * (an empty news feed, a shared section that isn't published). Only ever
 * rendered when BlockRenderer is invoked with `isPreview` — the public
 * output for those cases stays "render nothing".
 */
export function PreviewPlaceholder({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      role="note"
      data-preview-placeholder
      className="mx-auto my-6 max-w-3xl rounded border border-dashed border-osi-gold-500 bg-osi-white px-6 py-5 text-sm text-osi-navy-900"
    >
      <p className="font-semibold">{title}</p>
      <p className="mt-1 opacity-80">{children}</p>
    </div>
  );
}
