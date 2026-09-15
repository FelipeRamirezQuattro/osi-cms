import Link from "next/link";
import { getNavMenu } from "@/lib/data/navigation";
import { getSiteSettings } from "@/lib/data/settings";
import { ArrowButton } from "@/components/ui/arrow-button";
import { ExternalLinkIcon } from "@/components/ui/external-link-icon";
import { externalLinkAttrs } from "@/lib/routes";
import { SocialIcon } from "@/components/ui/social-icon";

const SOCIAL_LINKS = [
  { key: "social_facebook", label: "Facebook" },
  { key: "social_linkedin", label: "LinkedIn" },
  { key: "social_youtube", label: "YouTube" },
  { key: "social_instagram", label: "Instagram" },
] as const;

const COLUMN_LABELS = ["Solutions", "Resources", "Explore", "Company"] as const;

export async function Footer() {
  const [footer1, footer2, footer3, footer4, settings] = await Promise.all([
    getNavMenu("footer-1"),
    getNavMenu("footer-2"),
    getNavMenu("footer-3"),
    getNavMenu("footer-4"),
    getSiteSettings(),
  ]);
  const columns = [footer1, footer2, footer3, footer4];

  return (
    <footer className="border-t border-white/10 bg-osi-navy-900 px-5 py-12 text-osi-white md:px-10 md:py-16">
      <div className="mx-auto max-w-[var(--site-container)]">
        <div className="mb-12 grid gap-8 border-b border-white/12 pb-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-xl">
            <Link
              href="/"
              aria-label="OSI home"
              className="inline-flex min-h-11 items-center font-display text-xl font-bold tracking-wide-display uppercase"
            >
              OSI<span className="text-osi-gold-500">.</span>
            </Link>
            {settings.footer_tagline && (
              <p className="mt-3 max-w-lg font-editorial text-xl font-medium leading-snug text-white/78 md:text-2xl">
                {settings.footer_tagline}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <ArrowButton href="/services" variant="outline-light">
              Explore services
            </ArrowButton>
            <ArrowButton href="/contact" variant="solid-gold">
              Get in touch
            </ArrowButton>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4 md:gap-10">
          {columns.map((col, i) => (
            <div key={COLUMN_LABELS[i]}>
              <h2 className="mb-4 text-xs font-semibold tracking-[0.12em] text-osi-gold-500 uppercase">
                {COLUMN_LABELS[i]}
              </h2>
              <ul className="space-y-1">
                {col.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className="inline-flex min-h-10 items-center text-sm text-white/68 transition-colors duration-200 hover:text-white"
                      {...externalLinkAttrs(item.is_external)}
                    >
                      {item.label}
                      {item.is_external && <ExternalLinkIcon className="ml-1 text-[0.85em]" />}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 grid gap-8 border-t border-white/12 pt-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <address className="max-w-xl text-sm not-italic leading-relaxed text-white/64">
            {settings.phone && (
              <p><a className="hover:text-white" href={`tel:${settings.phone.replace(/[^+\d]/g, "")}`}>{settings.phone}</a></p>
            )}
            {settings.email && (
              <p><a className="hover:text-white" href={`mailto:${settings.email}`}>{settings.email}</a></p>
            )}
            {settings.address_lines?.map((line) => <p key={line}>{line}</p>)}
          </address>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1">
              {SOCIAL_LINKS.filter((s) => settings[s.key]).map((s) => (
                <a
                  key={s.key}
                  href={settings[s.key]!}
                  aria-label={s.label}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/18 text-white/72 transition-[color,background-color,border-color,transform] duration-200 hover:border-white/35 hover:bg-white/8 hover:text-white active:scale-[0.98]"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <SocialIcon network={s.label} />
                </a>
              ))}
            </div>
            <ArrowButton href="/locations" variant="ghost-arrow">
              Find a location
            </ArrowButton>
          </div>
        </div>

        <p className="mt-8 text-xs text-osi-slate-200">© {new Date().getFullYear()} Odessa Separator Inc.</p>
      </div>
    </footer>
  );
}
