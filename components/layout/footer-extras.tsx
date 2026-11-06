import Image from "next/image";
import Link from "next/link";
import { z } from "zod";
import { ExternalLinkIcon } from "@/components/ui/external-link-icon";
import { resolveMediaUrl } from "@/lib/media";
import { externalLinkAttrs } from "@/lib/routes";
import { footerBadgeSchema, footerUtilityLinkSchema } from "@/lib/validation/settings";

const isExternal = (href: string) => /^https?:\/\//i.test(href);

/**
 * Admin-editable footer extras (site_settings.footer_utility_links / footer_badges, migration 0060).
 * Entries that fail validation are skipped and an empty list renders nothing, so a half-filled setting never shows a broken link or image.
 */
export function FooterExtras({ utilityLinks, badges }: { utilityLinks: unknown; badges: unknown }) {
  const links = z.array(z.unknown()).catch([]).parse(utilityLinks).flatMap((l) => {
    const r = footerUtilityLinkSchema.safeParse(l);
    return r.success ? [r.data] : [];
  });
  const marks = z.array(z.unknown()).catch([]).parse(badges).flatMap((b) => {
    const r = footerBadgeSchema.safeParse(b);
    return r.success ? [r.data] : [];
  });
  if (links.length === 0 && marks.length === 0) return null;

  return (
    <div data-footer-extras className="mt-10 flex flex-wrap items-center justify-between gap-x-8 gap-y-6 border-t border-white/12 pt-8">
      {links.length > 0 && (
        <ul aria-label="Footer links" className="flex flex-wrap gap-x-6 gap-y-1">
          {links.map((link) => {
            const external = isExternal(link.href!);
            return (
              <li key={`${link.label}|${link.href}`}>
                <Link
                  href={link.href!}
                  className="inline-flex min-h-11 items-center text-sm text-white/68 transition-colors duration-200 hover:text-white"
                  {...externalLinkAttrs(external)}
                >
                  {link.label}
                  {external && <ExternalLinkIcon className="ml-1 text-[0.85em]" />}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {marks.length > 0 && (
        <ul aria-label="Certifications" className="flex flex-wrap items-center gap-3">
          {marks.map((badge) => {
            // Badge artwork has a white background, so it sits on a white plate to stay legible on the dark footer. Shown in full colour, no filter.
            const image = (
              <Image src={resolveMediaUrl(badge.imageUrl)} alt={badge.alt} width={480} height={480} sizes="80px" className="h-20 w-auto" />
            );
            return (
              <li key={badge.imageUrl} className="rounded-sm bg-white p-1.5">
                {badge.href ? (
                  <a href={badge.href} className="block" {...externalLinkAttrs(isExternal(badge.href))}>
                    {image}
                  </a>
                ) : (
                  image
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
