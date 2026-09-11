import Image from "next/image";
import Link from "next/link";
import { Clipped } from "./clipped";
import { DuotoneImage } from "./duotone-image";

/**
 * Motif 4 — label-plate card. Closed: image with a bottom plate (title
 * + circled arrow). Open: the plate expands to full-bleed body copy
 * over a gold "LEARN MORE" bar. Exactly one card per grid is open at a
 * time — that exclusivity is the parent block's job (product_grid,
 * feature_tiles in Phase 3): control `open` and call `onInteract` on
 * hover/focus (desktop) or tap (mobile) to request the swap.
 */
export function LabelPlateCard({
  title,
  body,
  href = "#",
  image,
  imageTreatment = "none",
  open,
  onInteract,
  className = "",
}: {
  title: string;
  body?: string;
  href?: string;
  image?: string;
  imageTreatment?: "duotone" | "none";
  open: boolean;
  onInteract?: () => void;
  className?: string;
}) {
  // Closed: the whole tile is the "open this card" control (role="button"
  // + tabIndex). Open: it renders a real <Link> ("Learn more") inside —
  // keeping role="button"/tabIndex on the wrapper too would nest two
  // interactive controls, which axe/WCAG 4.1.2 flags outright. onMouseEnter
  // stays either way, so hovering a *different* card can still swap which
  // one is open.
  return (
    <div
      role={open ? undefined : "button"}
      tabIndex={open ? undefined : 0}
      // aria-expanded is only a valid attribute alongside a
      // button/toggle role — once open, this div stops being that
      // toggle (the real "Learn more" Link inside is the interactive
      // element instead), so the attribute is dropped rather than set
      // to a state the element no longer has a role to hold.
      aria-expanded={open ? undefined : false}
      onMouseEnter={onInteract}
      onFocus={open ? undefined : onInteract}
      onClick={open ? undefined : onInteract}
      onKeyDown={
        open
          ? undefined
          : (e) => {
              if (e.key === "Enter" || e.key === " ") onInteract?.();
            }
      }
      className={`relative aspect-[3/4] overflow-hidden bg-osi-navy-700 ${className}`}
    >
      <Clipped corner="br" size="1.25rem" className="absolute inset-0">
        {open ? (
          <div className="flex h-full flex-col justify-between bg-osi-cream-200 p-6">
            <div>
              <h3 className="font-display text-card-label tracking-wide-display text-osi-navy-900 uppercase">
                {title}
              </h3>
              {body && <p className="mt-3 text-sm text-osi-slate-300">{body}</p>}
            </div>
            <Link
              href={href}
              className="-mx-6 -mb-6 flex items-center justify-between bg-osi-gold-500 px-6 py-3 font-display text-sm tracking-wide-display text-osi-navy-900 uppercase transition-colors hover:bg-osi-gold-400"
            >
              Learn more
              <span aria-hidden>→</span>
            </Link>
          </div>
        ) : (
          <>
            {imageTreatment === "duotone" ? (
              <DuotoneImage src={image} className="absolute inset-0" />
            ) : image ? (
              <Image src={image} alt="" fill className="object-cover" />
            ) : (
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-br from-osi-slate-400 to-osi-navy-800"
              />
            )}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-osi-navy-900/80 px-4 py-3">
              <span className="font-display text-card-label tracking-wide-display text-osi-white uppercase">
                {title}
              </span>
              <span
                aria-hidden
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-osi-white/70 text-osi-white"
              >
                →
              </span>
            </div>
          </>
        )}
      </Clipped>
    </div>
  );
}
