"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import { FieldRenderer } from "@/components/admin/field-renderer";
import { RelationOptionsProvider, type RelationOptionsMap } from "@/components/admin/relation-options";
import { deleteProductAction, saveProductAction } from "@/lib/actions/products";
import { PRODUCT_DEFAULTS, PRODUCT_FIELDS } from "@/lib/admin/product-fields";
import type { ProductAdminDetail } from "@/lib/data/products";

// Same reasoning as page-editor.tsx / entity-editor.tsx.
/* eslint-disable @typescript-eslint/no-explicit-any */

export function ProductEditor({
  product,
  relationOptions,
}: {
  product: ProductAdminDetail | null;
  relationOptions: RelationOptionsMap;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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

  function onDelete() {
    if (!product) return;
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      await deleteProductAction(product.id);
    });
  }

  return (
    <FormProvider {...form}>
      <RelationOptionsProvider options={relationOptions}>
        <div className="max-w-3xl space-y-6 pb-16">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-lg tracking-wide-display uppercase">
              {product ? `Edit ${product.name}` : "New product"}
            </h1>
            {product && (
              <button type="button" onClick={onDelete} className="text-xs text-red-600 hover:underline">
                Delete
              </button>
            )}
          </div>

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 rounded border border-osi-sand-300 bg-osi-white p-5"
          >
            {PRODUCT_FIELDS.map((field) => (
              <FieldRenderer key={field.key} spec={field} name={field.key} />
            ))}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={isPending}
              className="rounded bg-osi-navy-900 px-4 py-2 text-xs uppercase tracking-wide-label text-osi-white disabled:opacity-50"
            >
              {isPending ? "Saving…" : "Save"}
            </button>
          </form>
        </div>
      </RelationOptionsProvider>
    </FormProvider>
  );
}
