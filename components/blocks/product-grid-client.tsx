"use client";

import { useMemo, useState } from "react";
import { LabelPlateGrid } from "@/components/blocks/label-plate-grid";
import type { Tables } from "@/lib/db/database.types";
import type { ProductWithCategorySlug } from "@/lib/data/products";
import { applicationHref, industryHref, productHref } from "@/lib/routes";

type Tab = "products" | "industries" | "applications" | "services";

const TABS: { key: Tab; label: string }[] = [
  { key: "products", label: "Products" },
  { key: "industries", label: "Industries" },
  { key: "applications", label: "Applications" },
  { key: "services", label: "Services" },
];

type GridItem = { title: string; body?: string; href: string };

export function ProductGridClient({
  products,
  categories,
  industries,
  applications,
  services,
}: {
  products: ProductWithCategorySlug[];
  categories: Tables<"product_categories">[];
  industries: Tables<"industries">[];
  applications: Tables<"applications">[];
  // Pre-mapped by the caller from real `pages` (not the `services`
  // table, which stays unused — see docs/DECISIONS.md).
  services: GridItem[];
}) {
  const [tab, setTab] = useState<Tab>("products");
  const [categorySlug, setCategorySlug] = useState<string | "all">("all");

  const filteredProducts = useMemo(() => {
    if (categorySlug === "all") return products;
    return products.filter((p) => p.categorySlug === categorySlug);
  }, [products, categorySlug]);

  const itemsByTab: Record<Tab, GridItem[]> = {
    products: filteredProducts.map((p) => ({
      title: p.name,
      body: p.summary ?? undefined,
      href: p.categorySlug ? productHref(p.categorySlug, p.slug) : "/products",
    })),
    industries: industries.map((i) => ({
      title: i.name,
      body: i.description ?? undefined,
      href: industryHref(i.slug),
    })),
    applications: applications.map((a) => ({
      title: a.name,
      body: a.description ?? undefined,
      href: applicationHref(a.slug),
    })),
    services,
  };

  return (
    <div>
      <div className="mb-6 flex gap-8 border-b border-osi-sand-300">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`pb-3 font-display text-sm tracking-wide-display uppercase ${
              tab === t.key
                ? "border-b-2 border-osi-gold-700 text-osi-gold-700"
                : "text-osi-navy-900/75"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "products" && categories.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setCategorySlug("all")}
            className={`rounded-full border px-4 py-1 text-sm ${
              categorySlug === "all"
                ? "border-osi-gold-500 bg-osi-gold-500 text-osi-navy-900"
                : "border-osi-sand-300"
            }`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategorySlug(c.slug)}
              className={`rounded-full border px-4 py-1 text-sm ${
                categorySlug === c.slug
                  ? "border-osi-gold-500 bg-osi-gold-500 text-osi-navy-900"
                  : "border-osi-sand-300"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {itemsByTab[tab].length > 0 ? (
        <LabelPlateGrid items={itemsByTab[tab]} />
      ) : (
        <p className="text-sm text-osi-slate-400">Nothing published in this category yet.</p>
      )}
    </div>
  );
}
