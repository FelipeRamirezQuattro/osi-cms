import Link from "next/link";
import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";
import { HairlineGrid } from "@/components/ui/hairline-grid";
import { AnimatedGroup, AnimatedItem } from "@/components/ui/animated-group";
import { optionalSafeHrefSchema, requiredString } from "@/lib/validation/common";
import type { FieldSpec } from "@/lib/blocks/admin-fields";

const statSchema = z.object({
  value: requiredString("Stat value"),
  label: requiredString("Stat label"),
  href: optionalSafeHrefSchema({ allowAnchor: true, label: "Stat link" }),
});

const schema = blockCommonSchema.extend({
  stats: z.array(statSchema).min(2).max(6),
});

type Data = z.infer<typeof schema>;

function StatItem({ value, label, background }: z.infer<typeof statSchema> & { background: Data["background"] }) {
  return (
    <div className="relative z-10 h-full p-8">
      <p className="font-display text-3xl tracking-tightest-display text-[var(--block-accent,var(--brand-color-accent-on-light))]">
        {value}
      </p>
      <p className={`mt-2 text-sm ${background === "cream" ? "text-osi-slate-300" : "text-osi-slate-200"}`}>
        {label}
      </p>
    </div>
  );
}

// Tailwind can't see dynamically-built class names at build time, so
// the column count needs a literal lookup rather than string interpolation.
const COLS_CLASS: Record<number, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
  5: "sm:grid-cols-3 lg:grid-cols-5",
  6: "sm:grid-cols-3 lg:grid-cols-6",
};

function Render({ data }: { data: Data }) {
  const cols = COLS_CLASS[data.stats.length] ?? "sm:grid-cols-3";
  return (
    <Section
      background={data.background}
      spacingTop={data.spacingTop}
      spacingBottom={data.spacingBottom}
      anchorId={data.anchorId}
      reveal={false}
    >
      <AnimatedGroup className={`relative grid grid-cols-1 gap-px ${cols}`}>
        <HairlineGrid cols={data.stats.length} rows={1} className="-inset-x-5 md:-inset-x-10" />
        {data.stats.map((stat) =>
          stat.href ? (
            <AnimatedItem key={stat.label}>
              <Link href={stat.href} className="contents">
                <StatItem {...stat} background={data.background} />
              </Link>
            </AnimatedItem>
          ) : (
            <AnimatedItem key={stat.label}>
              <StatItem {...stat} background={data.background} />
            </AnimatedItem>
          ),
        )}
      </AnimatedGroup>
    </Section>
  );
}

const adminFields: FieldSpec[] = [
  {
    key: "stats",
    label: "Stats",
    type: "array",
    minItems: 2,
    maxItems: 6,
    itemFields: [
      { key: "value", label: "Value", type: "text" },
      { key: "label", label: "Label", type: "text" },
      { key: "href", label: "Link", type: "text", optional: true },
    ],
  },
];

export const statGridBlock = defineBlock({
  type: "stat_grid",
  label: "Stat grid",
  category: "content",
  description: "2-6 headline numbers with short labels in a hairline-grid band — use to call out key metrics (years in business, wells serviced, etc.).",
  schema,
  defaults: { background: "navy", spacingTop: "md", spacingBottom: "md", stats: [] },
  Render,
  adminFields,
});
