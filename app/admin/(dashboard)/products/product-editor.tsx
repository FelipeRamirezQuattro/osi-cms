"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import { FieldRenderer } from "@/components/admin/field-renderer";
import { RelationOptionsProvider, type RelationOptionsMap } from "@/components/admin/relation-options";
import { deleteProductAction, saveProductAction } from "@/lib/actions/products";
import { PRODUCT_DEFAULTS, PRODUCT_FIELDS } from "@/lib/admin/product-fields";
import { hasCapability } from "@/lib/auth/capabilities";
import type { AdminRole } from "@/lib/auth";
import type { ProductAdminDetail } from "@/lib/data/products";
import { FormCard, SubmitButton } from "@/components/admin/ui/form-card";
import { AsyncMessage } from "@/components/admin/ui/async-message";
import { useConfirmDialog } from "@/components/admin/ui/confirm-dialog";

// Same reasoning as page-editor.tsx / entity-editor.tsx.
/* eslint-disable @typescript-eslint/no-explicit-any */

export function ProductEditor({
  product,
  relationOptions,
  role = "editor",
}: {
  product: ProductAdminDetail | null;
  relationOptions: RelationOptionsMap;
  role?: AdminRole;
}) {
  const canDelete = hasCapability(role, "delete_content");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirmDialog();

  const form = useForm<any>({
    defaultValues: product
      ? {
          ...product,
          category_id: product.category_id ?? "",
          badge: product.badge ?? "none",
        }
      : PRODUCT_DEFAULTS,
  });

  function onSubmit(values: any) {
    setError(null);
    startTransition(async () => {
      const result = await saveProductAction(product?.id ?? null, values);
      if (result.status === "error") {
        setError(result.message);
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
          onSubmit={form.handleSubmit(onSubmit)}
        >
          {PRODUCT_FIELDS.map((field) => (
            <FieldRenderer key={field.key} spec={field} name={field.key} />
          ))}

          <AsyncMessage message={error ? { kind: "error", text: error } : null} />

          <SubmitButton pending={isPending} />
        </FormCard>
        {dialog}
      </RelationOptionsProvider>
    </FormProvider>
  );
}
