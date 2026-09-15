import Image from "next/image";
import Link from "next/link";
import { resolveMediaUrl } from "@/lib/media";

/**
 * Shared public discovery card. Content is visible without hover/tap and
 * the whole card is one semantic link; this replaces the old div-as-button
 * disclosure pattern that hid every teaser except the currently open card.
 */
export function LabelPlateCard({
  title,
  body,
  href = "#",
  image,
  imageTreatment = "none",
  className = "",
}: {
  title: string;
  body?: string;
  href?: string;
  image?: string;
  imageTreatment?: "duotone" | "none";
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`group flex h-full min-h-80 flex-col overflow-hidden rounded-[var(--site-radius-lg)] border border-[var(--site-border)] bg-[var(--site-surface-raised)] shadow-[0_1px_0_rgba(0,27,51,0.04)] transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-osi-steel-500/35 hover:shadow-[0_18px_45px_rgba(0,27,51,0.12)] active:translate-y-0 ${className}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-osi-navy-700">
        {image ? (
          <Image
            src={resolveMediaUrl(image)}
            alt=""
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className={`object-cover transition-transform duration-500 group-hover:scale-[1.025] ${imageTreatment === "duotone" ? "grayscale mix-blend-luminosity" : ""}`}
          />
        ) : (
          <div className="absolute inset-0 overflow-hidden bg-[linear-gradient(145deg,var(--color-osi-navy-700),var(--color-osi-navy-900))]">
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.18)_1px,transparent_1px)] [background-size:3rem_3rem]"
            />
            <div className="absolute inset-x-5 bottom-5 border-l border-osi-gold-500 pl-3 text-xs font-semibold tracking-[0.1em] text-white/72 uppercase">
              Technical overview
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5 md:p-6">
        <h3 className="font-editorial text-xl font-semibold leading-tight text-balance text-osi-navy-900">
          {title}
        </h3>
        {body && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-osi-slate-300">{body}</p>}
        <span className="mt-auto inline-flex min-h-11 items-center gap-2 pt-5 text-sm font-semibold text-osi-navy-900">
          Learn more
          <span
            aria-hidden="true"
            className="text-osi-gold-700 transition-transform duration-200 group-hover:translate-x-1"
          >
            →
          </span>
        </span>
      </div>
    </Link>
  );
}
