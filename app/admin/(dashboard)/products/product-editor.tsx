"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import { FieldRenderer } from "@/components/admin/field-renderer";
import { ProductBlocksField, type ProductBlocksHandle } from "@/components/admin/product-blocks-field";
import { useSaveProblemAlert } from "@/components/admin/use-block-problem-alert";
import type { BlockPaletteEntry } from "@/lib/blocks/registry";
import { RelationOptionsProvider, type RelationOptionsMap } from "@/components/admin/relation-options";
import { deleteProductAction, saveProductAction } from "@/lib/actions/products";
import { defaultLinkedRows, ensureLinkedRows } from "@/lib/products/layout";
import { PRODUCT_DEFAULTS, PRODUCT_FIELDS } from "@/lib/admin/product-fields";
import { hasCapability } from "@/lib/auth/capabilities";
import type { AdminRole } from "@/lib/auth";
import type { ProductAdminDetail } from "@/lib/data/products";
import { FormCard, SubmitButton } from "@/components/admin/ui/form-card";
import { ProductPreviewLink } from "@/components/admin/product-preview-link";
import { useConfirmDialog } from "@/components/admin/ui/confirm-dialog";

// Same reasoning as page-editor.tsx / entity-editor.tsx.
/* eslint-disable @typescript-eslint/no-explicit-any */

export function ProductEditor({
  product,
  relationOptions,
  palette,
  role = "editor",
}: {
  product: ProductAdminDetail | null;
  relationOptions: RelationOptionsMap;
  palette: BlockPaletteEntry[];
  role?: AdminRole;
}) {
  const canDelete = hasCapability(role, "delete_content");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { confirm, dialog } = useConfirmDialog();
  const blocksRef = useRef<ProductBlocksHandle>(null);
  // A failed save opens an alert dialog ("Go to block" when a block is at fault) instead of a line at the bottom of a long form.
  const { reportProblem, alertDialog } = useSaveProblemAlert((problem) => blocksRef.current?.reveal(problem));

  const form = useForm<any>({
    defaultValues: product
      ? {
          ...product,
          category_id: product.category_id ?? "",
          badge: product.badge ?? "none",
          blocks: ensureLinkedRows(product.blocks),
        }
      : { ...PRODUCT_DEFAULTS, blocks: defaultLinkedRows() },
  });

  function onSubmit(values: any) {
    startTransition(async () => {
      const result = await saveProductAction(product?.id ?? null, values);
      if (result.status === "error") {
        void reportProblem(result);
        return;
      }
      router.push("/admin/products");
      router.refresh();
    });
  }

  async function onDelete() {
    if (!product) return;
    const ok = await confirm({
      title: `Delete "${product.name}"?`,
      message: "This cannot be undone.",
      tone: "danger",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    startTransition(async () => {
      await deleteProductAction(product.id);
    });
  }

  return (
    <FormProvider {...form}>
      <RelationOptionsProvider options={relationOptions}>
        <FormCard
          title={product ? `Edit ${product.name}` : "New product"}
          backHref="/admin/products"
          backLabel="Products"
          onDelete={product && canDelete ? onDelete : undefined}
          headerActions={product && <ProductPreviewLink categorySlug={product.categorySlug} slug={product.slug} />}
          onSubmit={form.handleSubmit(onSubmit)}
        >
          {PRODUCT_FIELDS.map((field) => (
            <FieldRenderer key={field.key} spec={field} name={field.key} />
          ))}

          <ProductBlocksField ref={blocksRef} palette={palette} />

          <SubmitButton pending={isPending} />
        </FormCard>
        {dialog}
        {alertDialog}
      </RelationOptionsProvider>
    </FormProvider>
  );
}
