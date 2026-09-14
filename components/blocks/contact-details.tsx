import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";
import { getSiteSettings } from "@/lib/data/settings";
import { optionalSafeHrefSchema } from "@/lib/validation/common";
import type { FieldSpec } from "@/lib/blocks/admin-fields";

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

  return (
    <Section
      background={data.background}
      spacingTop={data.spacingTop}
      spacingBottom={data.spacingBottom}
      anchorId={data.anchorId}
    >
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        {mapUrl ? (
          <iframe src={mapUrl} title="Map" className="h-56 w-full border-0" loading="lazy" />
        ) : (
          <div
            className={`flex h-56 w-full items-center justify-center text-sm ${
              data.background === "cream"
                ? "bg-osi-sand-300/30 text-osi-slate-400"
                : "bg-osi-white/10 text-osi-white/80"
            }`}
          >
            Map unavailable
          </div>
        )}
        <div className="space-y-3 text-sm">
          {settings.phone && <p>{settings.phone}</p>}
          {settings.address_lines?.map((line) => <p key={line}>{line}</p>)}
          {data.showSocial && (
            <div className="flex gap-4 pt-2">
              {SOCIAL_LINKS.filter((s) => settings[s.key]).map((s) => (
                <a
                  key={s.key}
                  href={settings[s.key]!}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-current text-xs"
                  aria-label={s.label}
                >
                  {s.label[0]}
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
  schema,
  adminFields,
  defaults: { background: "navy", spacingTop: "md", spacingBottom: "md", mapEmbedUrl: null, showSocial: true },
  Render,
});
