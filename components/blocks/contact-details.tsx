import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";
import { getSiteSettings } from "@/lib/data/settings";
import { optionalSafeHrefSchema } from "@/lib/validation/common";
import type { FieldSpec } from "@/lib/blocks/admin-fields";
import { SocialIcon } from "@/components/ui/social-icon";

const schema = blockCommonSchema.extend({
  // Rendered directly as an <iframe src> below — not a click-navigable
  // link, but the same isSafeHref net is trivial to apply and rules out
  // a stray `javascript:`/`data:` value ending up in an iframe's src.
  mapEmbedUrl: optionalSafeHrefSchema({ label: "Map embed URL" }),
  showSocial: z.boolean().default(true),
});

type Data = z.infer<typeof schema>;

const SOCIAL_LINKS = [
  { key: "social_facebook", label: "Facebook" },
  { key: "social_linkedin", label: "LinkedIn" },
  { key: "social_youtube", label: "YouTube" },
  { key: "social_instagram", label: "Instagram" },
] as const;

async function Render({ data }: { data: Data }) {
  const settings = await getSiteSettings();
  const mapUrl = data.mapEmbedUrl ?? settings.map_embed_url;
  const address = settings.address_lines?.filter(Boolean).join(", ") ?? "";
  const directionsUrl = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : null;

  return (
    <Section
      background={data.background}
      spacingTop={data.spacingTop}
      spacingBottom={data.spacingBottom}
      anchorId={data.anchorId}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] lg:gap-10">
        {mapUrl ? (
          // Sandboxed to the same minimal Google Maps value the new
          // `embed` block uses (components/blocks/embed.tsx) — same risk
          // class (an editor-configurable iframe src), same fix. Maps
          // needs allow-scripts + allow-same-origin to render/navigate
          // internally, and allow-popups for its own "open in new tab"
          // controls.
          <iframe
            src={mapUrl}
            title="Map"
            className="min-h-72 w-full rounded-[var(--site-radius-lg)] border-0 bg-osi-white/8"
            loading="lazy"
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
        ) : (
          <div
            className={`flex min-h-56 w-full flex-col items-start justify-end rounded-[var(--site-radius-lg)] border p-6 text-sm ${
              data.background === "cream"
                ? "border-osi-navy-900/12 bg-white/45 text-osi-slate-300"
                : "border-white/15 bg-osi-white/8 text-white/82"
            }`}
          >
            <p className="font-editorial text-xl font-semibold text-current">Visit OSI</p>
            <p className="mt-2">Map preview unavailable. Use the address or open directions.</p>
            {directionsUrl && (
              <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center gap-2 font-semibold underline underline-offset-4">
                Open directions <span aria-hidden>↗</span>
              </a>
            )}
          </div>
        )}
        <div className="rounded-[var(--site-radius-lg)] border border-current/15 p-6 md:p-8">
          <p className="mb-5 font-editorial text-2xl font-semibold">Contact OSI</p>
          <address className="space-y-2 text-sm not-italic leading-relaxed">
            {settings.phone && (
              <p><a className="font-semibold underline decoration-current/30 underline-offset-4" href={`tel:${settings.phone.replace(/[^+\d]/g, "")}`}>{settings.phone}</a></p>
            )}
            {settings.email && (
              <p><a className="font-semibold underline decoration-current/30 underline-offset-4" href={`mailto:${settings.email}`}>{settings.email}</a></p>
            )}
            {settings.address_lines?.map((line) => <p key={line}>{line}</p>)}
          </address>
          {directionsUrl && mapUrl && (
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline underline-offset-4">
              Open directions <span aria-hidden>↗</span>
            </a>
          )}
          {data.showSocial && (
            <div className="flex gap-2 border-t border-current/15 pt-5">
              {SOCIAL_LINKS.filter((s) => settings[s.key]).map((s) => (
                <a
                  key={s.key}
                  href={settings[s.key]!}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-current/20 transition-[background-color,transform] duration-200 hover:bg-current/8 active:scale-[0.98]"
                  aria-label={s.label}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <SocialIcon network={s.label} />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}

const adminFields: FieldSpec[] = [
  { key: "mapEmbedUrl", label: "Map embed URL (overrides site setting)", type: "text", optional: true },
  { key: "showSocial", label: "Show social links", type: "boolean" },
];

export const contactDetailsBlock = defineBlock({
  type: "contact_details",
  label: "Contact details",
  category: "content",
  description: "Map iframe plus site-wide phone/address/social links pulled from Settings (with a per-instance map URL override) — use on the contact page or anywhere a compact contact panel is needed.",
  schema,
  adminFields,
  defaults: { background: "navy", spacingTop: "md", spacingBottom: "md", mapEmbedUrl: null, showSocial: true },
  Render,
});
