import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type Variant = "outline-light" | "outline-dark" | "solid-gold" | "ghost-arrow";

const VARIANT_CLASSES: Record<Exclude<Variant, "ghost-arrow">, string> = {
  "outline-light":
    "border-osi-white/70 text-osi-white hover:border-osi-white hover:bg-osi-white/10",
  "outline-dark":
    "border-osi-navy-900/70 text-osi-navy-900 hover:border-osi-navy-900 hover:bg-osi-navy-900/5",
  "solid-gold": "border-osi-gold-500 bg-osi-gold-500 text-osi-navy-900 hover:bg-osi-gold-400",
};

type CommonProps = {
  variant?: Variant;
  href?: string;
  className?: string;
  children: ReactNode;
};

/**
 * The universal OSI CTA (see CLAUDE.md / mockup motif 2): uppercase
 * Orbitron label with a thin-outlined circled arrow. `ghost-arrow` is
 * the inline text-link variant (leading arrow, no pill/circle).
 */
export function ArrowButton({
  variant = "outline-dark",
  href,
  className = "",
  children,
  ...rest
}: CommonProps & Omit<ComponentPropsWithoutRef<"button">, "className" | "children">) {
  if (variant === "ghost-arrow") {
    const content = (
      <span className="group inline-flex items-center gap-2 font-display text-sm tracking-wide-display uppercase">
        <span
          aria-hidden
          className="inline-block transition-transform motion-safe:group-hover:translate-x-1"
        >
          →
        </span>
        {children}
      </span>
    );
    return href ? (
      <Link href={href} className={className}>
        {content}
      </Link>
    ) : (
      <button type="button" className={className} {...rest}>
        {content}
      </button>
    );
  }

  const shared = `group inline-flex items-center gap-4 rounded-full border py-2 pr-2 pl-6 font-display text-sm tracking-wide-display uppercase transition-colors ${VARIANT_CLASSES[variant]} ${className}`;
  const inner = (
    <>
      <span>{children}</span>
      <span
        aria-hidden
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-current"
      >
        <span className="inline-block transition-transform motion-safe:group-hover:translate-x-1">
          →
        </span>
      </span>
    </>
  );

  return href ? (
    <Link href={href} className={shared}>
      {inner}
    </Link>
  ) : (
    <button type="button" className={shared} {...rest}>
      {inner}
    </button>
  );
}
