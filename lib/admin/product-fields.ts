import type { FieldSpec } from "@/lib/blocks/admin-fields";

/**
 * Products get a bespoke editor (app/admin/(dashboard)/products/) instead
 * of the generic simple-entity admin (lib/admin/entity-config.ts) — they
 * have child tables (benefits/stages/specs) and many-to-many relations
 * (industries/applications) the generic engine doesn't model. Reuses the
 * same FieldRenderer engine though: `array`+`itemFields` for the child
 * tables and `multi-relation` for the junction tables, split back out
 * into their own inserts by lib/actions/products.ts → saveProductAction.
 */
export const PRODUCT_FIELDS: FieldSpec[] = [
  { key: "name", label: "Name", type: "text" },
  { key: "slug", label: "Slug", type: "text" },
  { key: "category_id", label: "Category", type: "relation", relation: "categories", optional: true },
  { key: "eyebrow", label: "Eyebrow", type: "text", optional: true },
  { key: "tagline", label: "Tagline", type: "text", optional: true },
  { key: "badge", label: "Badge", type: "select", options: ["none", "new", "featured"] },
  { key: "summary", label: "Summary", type: "textarea", optional: true },
  { key: "body", label: "Body", type: "richtext", optional: true },
  {
    key: "hero_image_url",
    label: "Social share image (OG/SEO only — not shown on the page; the diagram image below is the on-page hero visual)",
    type: "image",
    optional: true,
  },
  { key: "diagram_image_url", label: "Diagram image", type: "image", optional: true },
  { key: "video_url", label: "Video URL", type: "text", optional: true },
  { key: "brochure_pdf_url", label: "Brochure PDF URL", type: "text", optional: true },
  { key: "model_3d_url", label: "3D model URL", type: "text", optional: true },
  // Task 15: products are one of the 4 archive-scoped tables (see
  // lib/admin/entity-config.ts's allowArchive comment) — 'archived' is a
  // manually-selectable option here too, on top of the dedicated
  // Archive/Restore buttons in products-list.tsx.
  { key: "status", label: "Status", type: "select", options: ["draft", "published", "archived"] },
  { key: "seo_title", label: "SEO title", type: "text", optional: true },
  { key: "seo_description", label: "SEO description", type: "textarea", optional: true },
  {
    key: "benefits",
    label: "Benefits",
    type: "array",
    itemFields: [
      { key: "title", label: "Title", type: "text" },
      { key: "body", label: "Body", type: "textarea", optional: true },
      { key: "icon_key", label: "Icon key", type: "text", optional: true },
    ],
  },
  {
    key: "stages",
    label: "Stages",
    type: "array",
    itemFields: [
      { key: "title", label: "Title", type: "text" },
      { key: "body", label: "Body", type: "textarea", optional: true },
      { key: "image_url", label: "Image", type: "image", optional: true },
    ],
  },
  {
    key: "specs",
    label: "Specs",
    type: "array",
    itemFields: [
      { key: "label", label: "Label", type: "text" },
      { key: "value", label: "Value", type: "text" },
      { key: "unit", label: "Unit", type: "text", optional: true },
    ],
  },
  { key: "industries", label: "Industries", type: "multi-relation", relation: "industries" },
  { key: "applications", label: "Applications", type: "multi-relation", relation: "applications" },
  { key: "related_product_ids", label: "Related products", type: "multi-relation", relation: "related_products" },
];

export const PRODUCT_DEFAULTS: Record<string, unknown> = {
  name: "",
  slug: "",
  locale: "en",
  category_id: "",
  badge: "none",
  status: "draft",
  position: 0,
  benefits: [],
  stages: [],
  specs: [],
  industries: [],
  applications: [],
  related_product_ids: [],
};

export const PRODUCT_RELATIONS = [
  { key: "categories", table: "product_categories", valueColumn: "id", labelColumn: "name" },
  { key: "industries", table: "industries", valueColumn: "id", labelColumn: "name" },
  { key: "applications", table: "applications", valueColumn: "id", labelColumn: "name" },
  // Self-referencing (products -> products); the product currently being
  // edited is filtered out of this option list by
  // getProductRelationOptionsAction, not here — this table-level config
  // has no notion of "the current row".
  { key: "related_products", table: "products", valueColumn: "id", labelColumn: "name" },
];
