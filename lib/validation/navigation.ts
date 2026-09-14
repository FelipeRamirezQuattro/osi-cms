import { z } from "zod";
import { optionalNullableString, requiredString, safeHrefSchema } from "@/lib/validation/common";

/**
 * lib/actions/navigation.ts's createNavItemAction/updateNavItemAction
 * currently accept an inline object type with no runtime validation at
 * all. A nav item's `href` renders straight into the mega menu/footer
 * `<a>` tags (components/layout/*), so it goes through the same
 * safeHrefSchema every block CTA does — allowing anchors (in-page menu
 * targets) and mailto:/tel: (a "Call us" or "Email us" menu entry).
 */
const navItemFieldsSchema = z.object({
  label: requiredString("Label"),
  href: safeHrefSchema({ allowAnchor: true, allowContact: true, label: "Link" }),
  badge: optionalNullableString(),
  is_external: z.boolean().default(false),
  parent_id: z.string().nullable().default(null),
});

export const navItemCreateSchema = navItemFieldsSchema.extend({
  menu_id: requiredString("Menu"),
});

export const navItemUpdateSchema = navItemFieldsSchema;

export type NavItemCreateInput = z.infer<typeof navItemCreateSchema>;
export type NavItemUpdateInput = z.infer<typeof navItemUpdateSchema>;
