import Link from "next/link";
import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";
import { HairlineGrid } from "@/components/ui/hairline-grid";

const statSchema = z.object({
  value: z.string(),
  label: z.string(),
  href: z.string().optional(),
});

const schema = blockCommonSchema.extend({
  stats: z.array(statSchema).min(2).max(6),
});

type Data = z.infer<typeof schema>;

function StatItem({ value, label }: z.infer<typeof statSchema>) {
  return (
    <div className="relative z-10 p-8">
      <p className="font-display text-3xl tracking-tightest-display text-osi-gold-500 uppercase">
        {value}
      </p>
      <p className="mt-2 text-sm text-osi-slate-300">{label}</p>
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
    >
      <div className={`relative grid grid-cols-1 gap-px ${cols}`}>
        <HairlineGrid cols={data.stats.length} rows={1} className="-inset-x-6 md:-inset-x-12" />
        {data.stats.map((stat) =>
          stat.href ? (
            <Link key={stat.label} href={stat.href} className="contents">
              <StatItem {...stat} />
            </Link>
          ) : (
            <StatItem key={stat.label} {...stat} />
          ),
        )}
      </div>
    </Section>
  );
}

export const statGridBlock = defineBlock({
  type: "stat_grid",
  label: "Stat grid",
  category: "content",
  schema,
  defaults: { background: "navy", spacingTop: "md", spacingBottom: "md", stats: [] },
  Render,
});
