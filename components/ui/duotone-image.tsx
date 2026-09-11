import Image from "next/image";

/**
 * Motif 5 — photography over navy sections gets a navy multiply overlay
 * plus slight desaturation so it sits in the palette. Renders a gradient
 * placeholder (still duotone-treated) when no `src` is given, since no
 * legacy photography is downloaded into this repo (see CLAUDE.md
 * constraint 4) — real photo URLs come from `media_assets` from Phase 4
 * onward and resolve through lib/media.ts.
 */
export function DuotoneImage({
  src,
  alt = "",
  className = "",
  intensity = 0.55,
  sizes,
}: {
  src?: string;
  alt?: string;
  className?: string;
  intensity?: number;
  sizes?: string;
}) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes ?? "100vw"}
          className="object-cover grayscale-[35%]"
        />
      ) : (
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-osi-slate-400 to-osi-navy-700"
        />
      )}
      <div
        aria-hidden
        className="absolute inset-0 bg-osi-navy-900 mix-blend-multiply"
        style={{ opacity: intensity }}
      />
    </div>
  );
}
