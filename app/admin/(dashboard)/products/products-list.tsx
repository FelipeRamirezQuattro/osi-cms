"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteProductAction, moveProductAction } from "@/lib/actions/products";
import { hasCapability } from "@/lib/auth/capabilities";
import type { AdminRole } from "@/lib/auth";
import type { Tables } from "@/lib/db/database.types";

export function ProductsList({
  products,
  categoryNames,
  role,
}: {
  products: Tables<"products">[];
  categoryNames: Record<string, string>;
  role: AdminRole;
}) {
  const canDelete = hasCapability(role, "delete_content");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function move(id: string, direction: "up" | "down") {
    startTransition(async () => {
      await moveProductAction(id, direction);
      router.refresh();
    });
  }

  function remove(product: Tables<"products">) {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      await deleteProductAction(product.id);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-lg tracking-wide-display uppercase">Products</h1>
        <Link
          href="/admin/products/new"
          className="rounded bg-osi-navy-900 px-4 py-2 text-xs uppercase tracking-wide-label text-osi-white"
        >
          New product
        </Link>
      </div>

      <div className="overflow-hidden rounded border border-osi-sand-300 bg-osi-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-osi-cream-100 text-xs uppercase tracking-wide-label opacity-70">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Order</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {products.map((product, index) => (
              <tr key={product.id} className="border-t border-osi-sand-300">
                <td className="px-4 py-2">
                  <Link href={`/admin/products/${product.id}`} className="font-medium hover:underline">
                    {product.name}
                  </Link>
                </td>
                <td className="px-4 py-2 opacity-70">
                  {product.category_id ? (categoryNames[product.category_id] ?? "—") : "—"}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={
                      product.status === "published"
                        ? "rounded bg-green-100 px-2 py-0.5 text-xs text-green-800"
                        : "rounded bg-osi-sand-300/50 px-2 py-0.5 text-xs opacity-70"
                    }
                  >
                    {product.status}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => move(product.id, "up")}
                      disabled={isPending || index === 0}
                      className="disabled:opacity-30"
                      aria-label="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(product.id, "down")}
                      disabled={isPending || index === products.length - 1}
                      className="disabled:opacity-30"
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                  </div>
                </td>
                <td className="px-4 py-2 text-right">
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => remove(product)}
                      disabled={isPending}
                      className="text-xs text-red-600 hover:underline disabled:opacity-40"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center opacity-50">
                  No products yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
