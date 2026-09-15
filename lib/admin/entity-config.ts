import type { FieldSpec } from "@/lib/blocks/admin-fields";

/**
 * Config for the generic simple-entity admin (app/admin/(dashboard)/
 * [entity]/) — one list + one edit screen reused for every content table
 * that's just flat columns with no child tables (industries, applications,
 * resources, locations, directory_contacts, news_posts, redirects).
 * Products get a bespoke /admin/products editor instead (child tables:
 * benefits/stages/specs, category + industry/application relations) —
 * see app/admin/(dashboard)/products/.
 *
 * No `services` entry: Services stays CMS pages (edited in /admin/pages
 * like any other page) rather than the dedicated `services` table —
 * that table exists in the schema (master prompt §5.3) but is
 * deliberately left unused. See docs/DECISIONS.md.
 *
 * Pure plain data (no Zod, no Supabase import) so it's safe to import from
 * both server and client files, same reasoning as lib/blocks/registry.ts's
 * getBlockPalette().
 */
export type EntityKey =
  | "product-categories"
  | "industries"
  | "applications"
  | "news"
  | "resources"
  | "locations"
  | "directory"
  | "redirects";

export type EntityRelation = { key: string; table: string; valueColumn: string; labelColumn: string };

export type EntityConfig = {
  table: string;
  label: string;
  pluralLabel: string;
  fields: FieldSpec[];
  listColumns: { key: string; label: string }[];
  hasPosition: boolean;
  hasStatus: boolean;
  defaults: Record<string, unknown>;
  relations?: EntityRelation[];
};

export const ENTITY_CONFIGS: Record<EntityKey, EntityConfig> = {
  "product-categories": {
    table: "product_categories",
    label: "Category",
    pluralLabel: "Product categories",
    // No draft state — see migration 0002's comment: a fixed, small
    // structural list the admin reorders/renames but doesn't unpublish.
    // products.category_id is a required part of every product's
    // canonical URL (productHref(categorySlug, slug)), so unlike
    // industries/applications this table intentionally has no `status`
    // column to begin with.
    hasPosition: true,
    hasStatus: false,
    listColumns: [
      { key: "name", label: "Name" },
      { key: "slug", label: "Slug" },
    ],
    fields: [
      { key: "name", label: "Name", type: "text" },
      { key: "slug", label: "Slug", type: "text" },
    ],
    defaults: { name: "", slug: "", position: 0 },
  },
  industries: {
    table: "industries",
    label: "Industry",
    pluralLabel: "Industries",
    hasPosition: true,
    hasStatus: true,
    listColumns: [
      { key: "name", label: "Name" },
      { key: "slug", label: "Slug" },
    ],
    fields: [
      { key: "name", label: "Name", type: "text" },
      { key: "slug", label: "Slug", type: "text" },
      { key: "icon_key", label: "Icon key", type: "text", optional: true },
      { key: "description", label: "Description", type: "textarea", optional: true },
    ],
    defaults: { name: "", slug: "", status: "draft", position: 0 },
  },
  applications: {
    table: "applications",
    label: "Application",
    pluralLabel: "Applications",
    hasPosition: true,
    hasStatus: true,
    listColumns: [
      { key: "name", label: "Name" },
      { key: "slug", label: "Slug" },
    ],
    fields: [
      { key: "name", label: "Name", type: "text" },
      { key: "slug", label: "Slug", type: "text" },
      { key: "description", label: "Description", type: "textarea", optional: true },
    ],
    defaults: { name: "", slug: "", status: "draft", position: 0 },
  },
  news: {
    table: "news_posts",
    label: "News post",
    pluralLabel: "News",
    hasPosition: false,
    hasStatus: true,
    listColumns: [
      { key: "title", label: "Title" },
      { key: "kind", label: "Kind" },
    ],
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "slug", label: "Slug", type: "text" },
      { key: "kind", label: "Kind", type: "select", options: ["news", "conference", "event"] },
      { key: "excerpt", label: "Excerpt", type: "textarea", optional: true },
      { key: "body", label: "Body", type: "richtext", optional: true },
      { key: "cover_image_url", label: "Cover image", type: "image", optional: true },
      { key: "published_at", label: "Published date", type: "date", optional: true },
      { key: "event_date", label: "Event date", type: "date", optional: true },
      { key: "event_location", label: "Event location", type: "text", optional: true },
      { key: "cta_label", label: "CTA label", type: "text", optional: true },
      { key: "cta_url", label: "CTA link", type: "text", optional: true },
      { key: "is_featured", label: "Featured", type: "boolean" },
    ],
    defaults: { title: "", slug: "", locale: "en", kind: "news", status: "draft", is_featured: false },
  },
  resources: {
    table: "resources",
    label: "Resource",
    pluralLabel: "Resources",
    hasPosition: true,
    hasStatus: true,
    listColumns: [
      { key: "title", label: "Title" },
      { key: "kind", label: "Kind" },
    ],
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "kind", label: "Kind", type: "select", options: ["brochure", "datasheet", "certificate", "manual"] },
      { key: "file_url", label: "File URL", type: "text" },
      { key: "thumbnail_url", label: "Thumbnail", type: "image", optional: true },
      { key: "product_id", label: "Product", type: "relation", relation: "products", optional: true },
      { key: "category", label: "Category", type: "text", optional: true },
    ],
    defaults: { title: "", kind: "brochure", file_url: "", status: "draft", position: 0 },
    relations: [{ key: "products", table: "products", valueColumn: "id", labelColumn: "name" }],
  },
  locations: {
    table: "locations",
    label: "Location",
    pluralLabel: "Locations",
    hasPosition: true,
    hasStatus: true,
    listColumns: [
      { key: "name", label: "Name" },
      { key: "country", label: "Country" },
      { key: "kind", label: "Kind" },
    ],
    fields: [
      { key: "name", label: "Name", type: "text" },
      { key: "kind", label: "Kind", type: "select", options: ["hq", "office", "distributor", "plant"] },
      { key: "country", label: "Country", type: "text" },
      { key: "country_code", label: "Country code", type: "text", optional: true },
      { key: "region", label: "Region", type: "text", optional: true },
      { key: "state", label: "State", type: "text", optional: true },
      { key: "city", label: "City", type: "text", optional: true },
      { key: "address", label: "Address", type: "textarea", optional: true },
      { key: "lat", label: "Latitude", type: "number", optional: true },
      { key: "lng", label: "Longitude", type: "number", optional: true },
      { key: "phone", label: "Phone", type: "text", optional: true },
      { key: "email", label: "Email", type: "text", optional: true },
      { key: "is_featured", label: "Featured", type: "boolean" },
    ],
    defaults: { name: "", kind: "distributor", country: "", status: "draft", position: 0, is_featured: false },
  },
  directory: {
    table: "directory_contacts",
    label: "Contact",
    pluralLabel: "Directory",
    hasPosition: true,
    hasStatus: true,
    listColumns: [
      { key: "name", label: "Name" },
      { key: "department", label: "Department" },
      { key: "role", label: "Role" },
    ],
    fields: [
      { key: "name", label: "Name", type: "text" },
      { key: "department", label: "Department", type: "text" },
      { key: "role", label: "Role", type: "text", optional: true },
      { key: "location_id", label: "Location", type: "relation", relation: "locations", optional: true },
      { key: "address", label: "Address", type: "textarea", optional: true },
      { key: "phone_office", label: "Office phone", type: "text", optional: true },
      { key: "phone_cell", label: "Cell phone", type: "text", optional: true },
      { key: "email", label: "Email", type: "text", optional: true },
      { key: "photo_url", label: "Photo", type: "image", optional: true },
    ],
    defaults: { name: "", department: "", status: "draft", position: 0 },
    relations: [{ key: "locations", table: "locations", valueColumn: "id", labelColumn: "name" }],
  },
  redirects: {
    table: "redirects",
    label: "Redirect",
    pluralLabel: "Redirects",
    hasPosition: false,
    hasStatus: false,
    listColumns: [
      { key: "from_path", label: "From" },
      { key: "to_path", label: "To" },
      { key: "status_code", label: "Code" },
    ],
    fields: [
      { key: "from_path", label: "From path", type: "text" },
      { key: "to_path", label: "To path", type: "text" },
      { key: "status_code", label: "Status code", type: "select", options: ["301", "302", "307", "308"] },
    ],
    defaults: { from_path: "", to_path: "", status_code: "301" },
  },
};

// Every hasStatus entity gets the same draft/published field appended
// once here, rather than repeated by hand in each `fields` array above.
const STATUS_FIELD: FieldSpec = { key: "status", label: "Status", type: "select", options: ["draft", "published"] };
for (const config of Object.values(ENTITY_CONFIGS)) {
  if (config.hasStatus) config.fields.push(STATUS_FIELD);
}

export function isEntityKey(value: string): value is EntityKey {
  return value in ENTITY_CONFIGS;
}
