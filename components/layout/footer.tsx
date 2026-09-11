import Link from "next/link";
import { getNavMenu } from "@/lib/data/navigation";
import { getSiteSettings } from "@/lib/data/settings";
import { ArrowButton } from "@/components/ui/arrow-button";

const SOCIAL_LINKS = [
  { key: "social_facebook", label: "Facebook" },
  { key: "social_linkedin", label: "LinkedIn" },
  { key: "social_youtube", label: "YouTube" },
  { key: "social_instagram", label: "Instagram" },
] as const;

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
    <footer className="bg-osi-navy-900 px-6 py-12 text-osi-white md:px-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-col items-start justify-between gap-6 border-b border-osi-steel-500/20 pb-10 sm:flex-row sm:items-center">
          <Link href="/" className="font-display text-xl tracking-wide-display uppercase">
            OSI
          </Link>
          <div className="flex flex-wrap gap-4">
            <ArrowButton href="/services" variant="outline-light">
              Services
            </ArrowButton>
            <ArrowButton href="/contact" variant="solid-gold">
              Get in touch
            </ArrowButton>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {columns.map((col, i) => (
            <ul key={i} className="space-y-2">
              {col.map((item) => (
                <li key={item.id}>
                  <Link href={item.href} className="text-sm opacity-80 hover:opacity-100">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          ))}
        </div>

        <div className="mt-10 flex flex-col justify-between gap-6 border-t border-osi-steel-500/20 pt-8 sm:flex-row sm:items-center">
          <div className="text-sm opacity-80">
            {settings.phone && <p>{settings.phone}</p>}
            {settings.address_lines?.map((line) => <p key={line}>{line}</p>)}
          </div>
          <div className="flex items-center gap-4">
            {SOCIAL_LINKS.filter((s) => settings[s.key]).map((s) => (
              <a
                key={s.key}
                href={settings[s.key]!}
                aria-label={s.label}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-current text-xs"
              >
                {s.label[0]}
              </a>
            ))}
            <ArrowButton href="/locations" variant="ghost-arrow">
              Find a location
            </ArrowButton>
          </div>
        </div>
      </div>
    </footer>
  );
}
