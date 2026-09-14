import Image from "next/image";
import { z } from "zod";
import { resolveMediaUrl } from "@/lib/media";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";
import { CtaBreakoutBar } from "@/components/ui/cta-breakout-bar";
import { listLocations } from "@/lib/data/locations";
import { safeHrefSchema } from "@/lib/validation/common";
import type { FieldSpec } from "@/lib/blocks/admin-fields";

const schema = blockCommonSchema.extend({
  title: z.string().default("See our global locations"),
  subtitle: z.string().optional(),
  // The interactive SVG map is still an open decision (docs/DECISIONS.md);
  // until then this renders the legacy site's own static world map above
  // the country pills, which is what the mockup shows. Optional, so the
  // block still works as a pill list when no image is set.
  mapImageUrl: z.string().optional(),
  ctaLabel: z.string().default("Find a distributor"),
  ctaHref: safeHrefSchema({ allowAnchor: true, label: "CTA link", defaultValue: "/locations" }),
});

type Data = z.infer<typeof schema>;

// Master prompt open question #3 asks whether the map is interactive
// (click a country -> distributor list) or static with a link to
// /locations. Rendering the simpler static list for now; swap in an SVG
// map + hover cards once that's answered (see docs/DECISIONS.md).
async function Render({ data }: { data: Data }) {
  const locations = await listLocations();
  const countries = [...new Set(locations.map((l) => l.country))].sort();

  return (
    <Section
      background={data.background}
      spacingTop={data.spacingTop}
      spacingBottom="lg"
      anchorId={data.anchorId}
      contentClassName="relative mx-auto max-w-6xl px-6 md:px-12"
    >
      <div className="mb-8 flex flex-col justify-between gap-4 border-b border-osi-steel-500/30 pb-6 sm:flex-row sm:items-center">
        <h2 className="font-display-soft text-section font-semibold">
          {data.title}
        </h2>
        {data.subtitle && (
          <p className={`text-sm ${data.background === "cream" ? "text-osi-slate-300" : "text-osi-slate-200"}`}>
            {data.subtitle}
          </p>
        )}
      </div>
      {data.mapImageUrl && (
        <div className="mb-8 overflow-hidden rounded-2xl bg-osi-white/95 p-4 md:p-8">
          {/* Not a DuotoneImage: the map's country labels are baked into
              the artwork, so tinting it would cost legibility. */}
          <Image
            src={resolveMediaUrl(data.mapImageUrl)}
            alt="Map of OSI locations and distributors worldwide"
            width={1538}
            height={697}
            sizes="(min-width: 768px) 72rem, 100vw"
            className="h-auto w-full"
          />
        </div>
      )}
      <div className="mx-auto flex max-w-3xl flex-wrap justify-center gap-3 rounded-full bg-osi-white/95 px-8 py-12 text-osi-navy-900">
        {countries.length > 0 ? (
          countries.map((country) => (
            <span
              key={country}
              className="rounded-full border border-osi-sand-300 px-4 py-1 text-sm"
            >
              {country}
            </span>
          ))
        ) : (
          <p className="text-sm text-osi-slate-400">No published locations yet.</p>
        )}
      </div>
      <CtaBreakoutBar href={data.ctaHref}>{data.ctaLabel}</CtaBreakoutBar>
    </Section>
  );
}

const adminFields: FieldSpec[] = [
  { key: "title", label: "Title", type: "text" },
  { key: "subtitle", label: "Subtitle", type: "text", optional: true },
  { key: "mapImageUrl", label: "Map image", type: "image", optional: true },
  { key: "ctaLabel", label: "CTA label", type: "text" },
  { key: "ctaHref", label: "CTA link", type: "text" },
];

export const globalMapBlock = defineBlock({
  type: "global_map",
  label: "Global map",
  category: "content",
  schema,
  adminFields,
  defaults: {
    background: "navy",
    spacingTop: "md",
    spacingBottom: "lg",
    title: "See our global locations",
    ctaLabel: "Find a distributor",
    ctaHref: "/locations",
  },
  Render,
});
