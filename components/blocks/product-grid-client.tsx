"use client";

import { useMemo } from "react";
import { LabelPlateGrid } from "@/components/blocks/label-plate-grid";
import { EmptyState } from "@/components/ui/public-primitives";
import { useQueryState } from "@/components/ui/use-query-state";
import type { Tables } from "@/lib/db/database.types";
import type { ProductWithCategorySlug } from "@/lib/data/products";
import { applicationHref, industryHref, productHref } from "@/lib/routes";

type View = "products" | "industries" | "applications" | "services";
type Sort = "az" | "za";

const VIEWS: { key: View; label: string }[] = [
  { key: "products", label: "Products" },
  { key: "industries", label: "Industries" },
  { key: "applications", label: "Applications" },
  { key: "services", label: "Services" },
];

type GridItem = { title: string; body?: string; href: string };

function isView(value: string | null): value is View {
  return VIEWS.some((view) => view.key === value);
}

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
  services: GridItem[];
}) {
  const { params, updateQuery } = useQueryState();
  const viewParam = params.get("view");
  const view: View = isView(viewParam) ? viewParam : "products";
  const category = params.get("category") ?? "all";
  const query = params.get("query")?.trim() ?? "";
  const sort: Sort = params.get("sort") === "za" ? "za" : "az";

  const items = useMemo(() => {
    const source: Record<View, GridItem[]> = {
      products: products
        .filter((product) => category === "all" || product.categorySlug === category)
        .map((product) => ({
          title: product.name,
          body: product.summary ?? undefined,
          href: product.categorySlug ? productHref(product.categorySlug, product.slug) : "/products",
        })),
      industries: industries.map((industry) => ({
        title: industry.name,
        body: industry.description ?? undefined,
        href: industryHref(industry.slug),
      })),
      applications: applications.map((application) => ({
        title: application.name,
        body: application.description ?? undefined,
        href: applicationHref(application.slug),
      })),
      services,
    };

    const normalizedQuery = query.toLocaleLowerCase();
    return source[view]
      .filter((item) => !normalizedQuery || `${item.title} ${item.body ?? ""}`.toLocaleLowerCase().includes(normalizedQuery))
      .sort((a, b) => (sort === "az" ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title)));
  }, [applications, category, industries, products, query, services, sort, view]);

  function changeView(nextView: View) {
    updateQuery({ view: nextView === "products" ? null : nextView, category: null });
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    updateQuery({ query: String(form.get("product-query") ?? "").trim() || null });
  }

  return (
    <div>
      <div className="mb-7 flex gap-2 overflow-x-auto border-b border-osi-navy-900/12 pb-3 [scrollbar-width:thin]">
        {VIEWS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => changeView(item.key)}
            aria-pressed={view === item.key}
            className="min-h-11 shrink-0 rounded-full border border-transparent px-4 text-sm font-semibold text-osi-slate-300 transition-[color,background-color,border-color,transform] duration-200 hover:text-osi-navy-900 active:scale-[0.98] aria-pressed:border-osi-navy-900/14 aria-pressed:bg-osi-navy-900 aria-pressed:text-white"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mb-7 grid gap-4 rounded-[var(--site-radius-lg)] border border-[var(--site-border)] bg-white/40 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:p-5">
        <form onSubmit={submitSearch} className="flex min-w-0 gap-2">
          <label className="min-w-0 flex-1">
            <span className="mb-1.5 block text-xs font-semibold text-osi-slate-300">Search this view</span>
            <input
              key={`${view}-${query}`}
              type="search"
              name="product-query"
              defaultValue={query}
              autoComplete="off"
              placeholder={`Search ${VIEWS.find((item) => item.key === view)?.label.toLocaleLowerCase()}…`}
              className="min-h-11 w-full rounded-full border border-osi-navy-900/18 bg-white px-4 text-sm outline-none transition-[border-color,box-shadow] duration-200 focus:border-osi-steel-500 focus:shadow-[0_0_0_3px_rgba(35,78,123,0.12)]"
            />
          </label>
          <button
            type="submit"
            className="mt-[1.625rem] min-h-11 rounded-full bg-osi-navy-900 px-5 text-sm font-semibold text-white transition-[background-color,transform] duration-200 hover:bg-osi-navy-700 active:scale-[0.98]"
          >
            Search
          </button>
        </form>
        <label>
          <span className="mb-1.5 block text-xs font-semibold text-osi-slate-300">Sort</span>
          <select
            value={sort}
            onChange={(event) => updateQuery({ sort: event.target.value === "za" ? "za" : null })}
            className="min-h-11 w-full rounded-full border border-osi-navy-900/18 bg-white px-4 text-sm outline-none md:w-auto"
          >
            <option value="az">A–Z</option>
            <option value="za">Z–A</option>
          </select>
        </label>
      </div>

      {view === "products" && categories.length > 0 && (
        <div className="mb-7 flex flex-wrap gap-2" aria-label="Product categories">
          <button
            type="button"
            onClick={() => updateQuery({ category: null })}
            aria-pressed={category === "all"}
            className="min-h-11 rounded-full border border-osi-navy-900/16 px-4 text-sm font-medium transition-[color,background-color,border-color,transform] duration-200 active:scale-[0.98] aria-pressed:border-osi-gold-700 aria-pressed:bg-osi-gold-500 aria-pressed:text-osi-navy-900"
          >
            All products
          </button>
          {categories.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => updateQuery({ category: item.slug })}
              aria-pressed={category === item.slug}
              className="min-h-11 rounded-full border border-osi-navy-900/16 px-4 text-sm font-medium transition-[color,background-color,border-color,transform] duration-200 active:scale-[0.98] aria-pressed:border-osi-gold-700 aria-pressed:bg-osi-gold-500 aria-pressed:text-osi-navy-900"
            >
              {item.name}
            </button>
          ))}
        </div>
      )}

      <p role="status" aria-live="polite" className="mb-5 text-sm text-osi-slate-300">
        {items.length} {items.length === 1 ? "result" : "results"}
        {query ? ` for “${query}”` : ""}
      </p>

      {items.length > 0 ? (
        <LabelPlateGrid items={items} />
      ) : (
        <EmptyState
          title="No matches in this view"
          description="Try a broader search, choose another category, or clear the active filters."
          action={
            <button
              type="button"
              onClick={() => updateQuery({ category: null, query: null, sort: null })}
              className="min-h-11 rounded-full border border-osi-navy-900/25 px-5 text-sm font-semibold transition-[background-color,transform] duration-200 hover:bg-osi-navy-900/5 active:scale-[0.98]"
            >
              Clear filters
            </button>
          }
        />
      )}
    </div>
  );
}
