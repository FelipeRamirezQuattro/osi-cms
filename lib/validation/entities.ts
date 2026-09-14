import { z } from "zod";
import type { EntityKey } from "@/lib/admin/entity-config";
import {
  emptyStringToNull,
  optionalEmailSchema,
  optionalNullableNumber,
  optionalNullableString,
  optionalSafeHrefSchema,
  requiredString,
  safeHrefSchema,
  slugSchema,
} from "@/lib/validation/common";
import { tiptapDocSchema } from "@/lib/validation/rich-text";

/**
 * One Zod schema per lib/admin/entity-config.ts EntityKey — the generic
 * simple-entity admin (lib/actions/entities.ts → saveEntityAction) had no
 * runtime validation at all before this: `coerceValues` only coerces
 * form-control strings back to a column's storage type (number/date/
 * relation), it never checks anything is actually present or well
 * formed. These schemas run on that already-coerced payload, so
 * optional number/date/relation fields arrive as `null` (not `""`)
 * already — the `optionalNullable*` helpers here are still applied so
 * each schema is correct standing alone, not just after that one caller.
 */

const statusSchema = z.enum(["draft", "published"]);

const industrySchema = z.object({
  name: requiredString("Name"),
  slug: slugSchema("Slug"),
  icon_key: optionalNullableString(),
  description: optionalNullableString(),
  status: statusSchema,
});

const applicationSchema = z.object({
  name: requiredString("Name"),
  slug: slugSchema("Slug"),
  description: optionalNullableString(),
  status: statusSchema,
});

const NEWS_KINDS = ["news", "conference", "event"] as const;

function optionalDateSchema(label: string) {
  return z.preprocess(
    emptyStringToNull,
    z
      .string()
      .refine((value) => !Number.isNaN(Date.parse(value)), `${label} must be a valid date`)
      .nullable()
      .default(null),
  );
}

const newsSchema = z
  .object({
    title: requiredString("Title"),
    slug: slugSchema("Slug"),
    kind: z.enum(NEWS_KINDS),
    excerpt: optionalNullableString(),
    body: z.preprocess((v) => (v === undefined ? null : v), tiptapDocSchema.nullable().default(null)),
    cover_image_url: optionalNullableString(),
    published_at: optionalDateSchema("Published date"),
    event_date: optionalDateSchema("Event date"),
    event_location: optionalNullableString(),
    cta_label: optionalNullableString(),
    cta_url: optionalSafeHrefSchema({ label: "CTA link" }),
    is_featured: z.boolean().default(false),
    status: statusSchema,
  })
  // A conference/event post's date is the entire point of publishing it —
  // nothing renders it yet (see CLAUDE.md's known content gaps), but the
  // column exists precisely for that, so this is enforced now rather than
  // left for whoever builds the news detail page to discover the hard way.
  .superRefine((data, ctx) => {
    if (data.status === "published" && data.kind !== "news" && !data.event_date) {
      ctx.addIssue({
        code: "custom",
        path: ["event_date"],
        message: `Event date is required before publishing a ${data.kind} post.`,
      });
    }
  });

const RESOURCE_KINDS = ["brochure", "datasheet", "certificate", "manual"] as const;

const resourceSchema = z.object({
  title: requiredString("Title"),
  kind: z.enum(RESOURCE_KINDS),
  // A resource's file_url is the whole point of the row (it's what the
  // "Download" link on /resources points at) — always a legacy or
  // uploaded absolute URL, never a script/anchor, so no allowAnchor here.
  file_url: safeHrefSchema({ label: "File URL" }),
  thumbnail_url: optionalNullableString(),
  product_id: z.preprocess(emptyStringToNull, z.string().nullable().default(null)),
  category: optionalNullableString(),
  status: statusSchema,
});

const LOCATION_KINDS = ["hq", "office", "distributor", "plant"] as const;

const locationSchema = z.object({
  name: requiredString("Name"),
  kind: z.enum(LOCATION_KINDS),
  country: requiredString("Country"),
  country_code: optionalNullableString(),
  region: optionalNullableString(),
  state: optionalNullableString(),
  city: optionalNullableString(),
  address: optionalNullableString(),
  lat: optionalNullableNumber(-90, 90),
  lng: optionalNullableNumber(-180, 180),
  phone: optionalNullableString(),
  email: optionalEmailSchema(),
  is_featured: z.boolean().default(false),
  status: statusSchema,
});

const directorySchema = z.object({
  name: requiredString("Name"),
  department: requiredString("Department"),
  role: optionalNullableString(),
  location_id: z.preprocess(emptyStringToNull, z.string().nullable().default(null)),
  address: optionalNullableString(),
  phone_office: optionalNullableString(),
  phone_cell: optionalNullableString(),
  email: optionalEmailSchema(),
  photo_url: optionalNullableString(),
  status: statusSchema,
});

const REDIRECT_STATUS_CODES = [301, 302, 307, 308] as const;

const redirectSchema = z.object({
  from_path: z
    .string()
    .trim()
    .min(1, "From path is required")
    .regex(/^\/\S*$/, 'From path must start with "/" and contain no spaces'),
  to_path: safeHrefSchema({ label: "To path" }),
  status_code: z.union(REDIRECT_STATUS_CODES.map((code) => z.literal(code)) as [z.ZodLiteral<number>, ...z.ZodLiteral<number>[]]),
});

const ENTITY_SCHEMAS = {
  industries: industrySchema,
  applications: applicationSchema,
  news: newsSchema,
  resources: resourceSchema,
  locations: locationSchema,
  directory: directorySchema,
  redirects: redirectSchema,
} satisfies Record<EntityKey, z.ZodTypeAny>;

export function validateEntityInput(entity: EntityKey, payload: Record<string, unknown>) {
  return ENTITY_SCHEMAS[entity].safeParse(payload);
}
