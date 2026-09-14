"use server";

import { redirect } from "next/navigation";
import { requireCapability } from "@/lib/auth";
import {
  createProductRow,
  deleteProductRow,
  getProductByIdAdmin,
  listAllProducts,
  saveProductChildren,
  updateProductRow,
  type ProductAdminDetail,
} from "@/lib/data/products";
import { listEntityRows, listRelationOptions, moveEntityRow } from "@/lib/data/admin-entities";
import { PRODUCT_RELATIONS } from "@/lib/admin/product-fields";
import type { RelationOptionsMap } from "@/components/admin/relation-options";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/db/database.types";

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

export type SaveProductResult = { status: "success"; id: string } | { status: "error"; message: string };

// The product form's flat values, as produced by FieldRenderer against
// PRODUCT_FIELDS (lib/admin/product-fields.ts) — untyped for the same
// reason page-editor.tsx's form is untyped (see CLAUDE.md).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function saveProductAction(id: string | null, values: any): Promise<SaveProductResult> {
  await requireCapability("edit_drafts");

  const { benefits, stages, specs, industries, applications, ...rest } = values;

  const meta: Record<string, unknown> = {
    ...rest,
    category_id: rest.category_id || null,
    badge: rest.badge === "none" ? null : rest.badge,
    locale: "en",
  };

  try {
    let productId = id;
    if (productId) {
      await updateProductRow(productId, meta as TablesUpdate<"products">);
    } else {
      const existing = await listEntityRows("products", [{ column: "position", ascending: false }]);
      meta.position = existing.length > 0 ? Number(existing[0].position ?? 0) + 1 : 0;
      const created = await createProductRow(meta as TablesInsert<"products">);
      productId = created.id;
    }

    await saveProductChildren(
      productId,
      benefits ?? [],
      stages ?? [],
      specs ?? [],
      industries ?? [],
      applications ?? [],
    );

    return { status: "success", id: productId };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Save failed." };
  }
}

export async function deleteProductAction(id: string): Promise<void> {
  await requireCapability("delete_content");
  await deleteProductRow(id);
  redirect("/admin/products");
}
