"use server";

import { redirect } from "next/navigation";
import { requireCapability, requirePublishCapabilityForStatusChange } from "@/lib/auth";
import {
  deleteProduct,
  getProductByIdAdmin,
  listAllProducts,
  saveProduct,
  type ProductAdminDetail,
} from "@/lib/data/products";
import { getEntityRow, listEntityRows, listRelationOptions, moveEntityRow } from "@/lib/data/admin-entities";
import { PRODUCT_RELATIONS } from "@/lib/admin/product-fields";
import type { RelationOptionsMap } from "@/components/admin/relation-options";
import type { Tables } from "@/lib/db/database.types";
import { formatZodError, isUniqueViolationError } from "@/lib/validation/common";
import { productSaveInputSchema } from "@/lib/validation/products";

export async function listProductsAction(): Promise<Tables<"products">[]> {
  await requireCapability("edit_drafts");
  return listAllProducts();
}

export async function getProductAction(id: string): Promise<ProductAdminDetail | null> {
  await requireCapability("edit_drafts");
  return getProductByIdAdmin(id);
}

export async function getProductRelationOptionsAction(): Promise<RelationOptionsMap> {
  await requireCapability("edit_drafts");
  const entries = await Promise.all(
    PRODUCT_RELATIONS.map(async (r) => [r.key, await listRelationOptions(r.table, r.valueColumn, r.labelColumn)] as const),
  );
  return Object.fromEntries(entries);
}

export async function moveProductAction(id: string, direction: "up" | "down"): Promise<void> {
  await requireCapability("edit_drafts");
  await moveEntityRow("products", id, direction);
}

export type SaveProductResult =
  | { status: "success"; id: string }
  | { status: "error"; message: string; field?: string };

// The product form's flat values, as produced by FieldRenderer against
// PRODUCT_FIELDS (lib/admin/product-fields.ts) — untyped for the same
// reason page-editor.tsx's form is untyped (see CLAUDE.md).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function saveProductAction(id: string | null, values: any): Promise<SaveProductResult> {
  await requireCapability("edit_drafts");

  const parsed = productSaveInputSchema.safeParse(values);
  if (!parsed.success) {
    const { message, field } = formatZodError(parsed.error);
    return { status: "error", message, field };
  }
  const { benefits, stages, specs, industries, applications, ...rest } = parsed.data;

  const meta: Record<string, unknown> = { ...rest, locale: "en" };

  // edit_drafts alone covers creating/editing a product's fields;
  // flipping its status to/from "published" needs the publish
  // capability too (an editor can still edit a live product's other
  // fields — see requirePublishCapabilityForStatusChange). Read the
  // pre-save status via the same generic getEntityRow the entity admin
  // uses (products is a plain table by that measure too), and check
  // this — and let it redirect — before the try/catch below, since a
  // redirect() thrown inside that catch would be swallowed instead of
  // actually redirecting.
  const currentStatus = id ? ((await getEntityRow("products", id))?.status as string | null | undefined) : null;
  await requirePublishCapabilityForStatusChange(currentStatus, meta.status as string | null | undefined);

  try {
    if (!id) {
      const existing = await listEntityRows("products", [{ column: "position", ascending: false }]);
      meta.position = existing.length > 0 ? Number(existing[0].position ?? 0) + 1 : 0;
    }

    const productId = await saveProduct(
      id,
      meta,
      benefits ?? [],
      stages ?? [],
      specs ?? [],
      industries ?? [],
      applications ?? [],
    );

    return { status: "success", id: productId };
  } catch (err) {
    if (isUniqueViolationError(err)) {
      return { status: "error", message: "That slug is already in use by another product — choose a different one.", field: "slug" };
    }
    return { status: "error", message: err instanceof Error ? err.message : "Save failed." };
  }
}

export async function deleteProductAction(id: string): Promise<void> {
  await requireCapability("delete_content");
  await deleteProduct(id);
  redirect("/admin/products");
}
