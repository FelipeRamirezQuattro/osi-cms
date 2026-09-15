import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";
import { ResourceListClient } from "@/components/blocks/resource-list-client";
import { listResources } from "@/lib/data/resources";
import { listProducts } from "@/lib/data/products";
import type { FieldSpec } from "@/lib/blocks/admin-fields";

// Schema/registration must NOT carry "use client" — same reason as
// contact-form.tsx/video-embed.tsx/stages-carousel.tsx: the registry
// reads `.schema` server-side, and this block's filter controls need
// interactivity, so that part lives in resource-list-client.tsx instead.
const schema = blockCommonSchema.extend({
  title: z.string().default("Resources"),
  // A block-level preset filter, applied server-side before the client
  // filter controls ever see the data — leave blank to show every
  // published resource. Free text (not a `relation` FieldSpec): blocks
  // don't reference other tables by id (see admin-fields.ts's comment
  // on `relation`), and resources.category is a plain text column with
  // no fixed vocabulary to pick from yet (0 live rows today).
  category: z.string().optional(),
  emptyStateMessage: z.string().default("Nothing published yet — check back soon."),
});

export type ResourceListData = z.infer<typeof schema>;

async function Render({ data }: { data: ResourceListData }) {
  const [resources, products] = await Promise.all([listResources(data.category), listProducts()]);
  const productNameById = new Map(products.map((p) => [p.id, p.name]));

  const items = resources.map((r) => ({
    id: r.id,
    title: r.title,
    kind: r.kind,
    category: r.category,
    fileUrl: r.file_url,
    productName: r.product_id ? (productNameById.get(r.product_id) ?? null) : null,
  }));

  return (
    <Section
      background={data.background}
      spacingTop={data.spacingTop}
      spacingBottom={data.spacingBottom}
      anchorId={data.anchorId}
      reveal={false}
    >
      {data.title && (
        <h2 className="mb-8 font-editorial text-section font-semibold text-balance">{data.title}</h2>
      )}
      <ResourceListClient resources={items} emptyStateMessage={data.emptyStateMessage} />
    </Section>
  );
}

const adminFields: FieldSpec[] = [
  { key: "title", label: "Title", type: "text" },
  { key: "category", label: "Category filter (optional — leave blank for all)", type: "text", optional: true },
  { key: "emptyStateMessage", label: "Empty state message", type: "text" },
];

export const resourceListBlock = defineBlock({
  type: "resource_list",
  label: "Resource list",
  category: "content",
  description:
    "Downloadable brochures/datasheets/certificates/manuals with type/category/product filters — optionally pre-scoped to one category; leave blank to list everything published.",
  schema,
  adminFields,
  defaults: {
    background: "cream",
    spacingTop: "md",
    spacingBottom: "md",
    title: "Resources",
    emptyStateMessage: "Nothing published yet — check back soon.",
  },
  Render,
});
