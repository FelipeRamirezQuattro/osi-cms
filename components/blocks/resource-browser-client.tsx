"use client";

import { useMemo } from "react";
import { EmptyState } from "@/components/ui/public-primitives";
import { useQueryState } from "@/components/ui/use-query-state";

export type ResourceBrowserItem = {
  id: string;
  title: string;
  kind: string;
  category: string | null;
  fileUrl: string;
  productName: string | null;
};

const KIND_LABELS: Record<string, string> = {
  brochure: "Brochure",
  datasheet: "Datasheet",
  certificate: "Certificate",
  manual: "Manual",
};

const selectClass =
  "min-h-11 w-full rounded-full border border-osi-navy-900/18 bg-white px-4 text-sm text-osi-navy-900 outline-none transition-[border-color,box-shadow] duration-200 focus:border-osi-steel-500 focus:shadow-[0_0_0_3px_rgba(35,78,123,0.12)]";

export function ResourceBrowserClient({ resources, emptyStateMessage }: { resources: ResourceBrowserItem[]; emptyStateMessage?: string }) {
  const { params, updateQuery } = useQueryState();
  const kind = params.get("type") ?? "all";
  const category = params.get("category") ?? "all";
  const productName = params.get("product") ?? "all";

  const kinds = useMemo(() => [...new Set(resources.map((resource) => resource.kind))].sort(), [resources]);
  const categories = useMemo(
    () => [...new Set(resources.map((resource) => resource.category).filter((value): value is string => Boolean(value)))].sort(),
    [resources],
  );
  const productNames = useMemo(
    () => [...new Set(resources.map((resource) => resource.productName).filter((value): value is string => Boolean(value)))].sort(),
    [resources],
  );

  const filtered = resources.filter(
    (resource) =>
      (kind === "all" || resource.kind === kind) &&
      (category === "all" || resource.category === category) &&
      (productName === "all" || resource.productName === productName),
  );

  if (resources.length === 0) {
    return (
      <EmptyState
        title="No resources are published yet"
        description={emptyStateMessage ?? "Brochures, datasheets, certificates, and manuals will appear here once published."}
      />
    );
  }

  return (
    <div>
      <div className="mb-7 grid gap-4 rounded-[var(--site-radius-lg)] border border-[var(--site-border)] bg-white/40 p-4 sm:grid-cols-2 md:p-5 lg:grid-cols-3">
        <label>
          <span className="mb-1.5 block text-xs font-semibold text-osi-slate-300">Resource type</span>
          <select aria-label="Filter by type" value={kind} onChange={(event) => updateQuery({ type: event.target.value })} className={selectClass}>
            <option value="all">All types</option>
            {kinds.map((value) => <option key={value} value={value}>{KIND_LABELS[value] ?? value}</option>)}
          </select>
        </label>
        {categories.length > 0 && (
          <label>
            <span className="mb-1.5 block text-xs font-semibold text-osi-slate-300">Category</span>
            <select aria-label="Filter by category" value={category} onChange={(event) => updateQuery({ category: event.target.value })} className={selectClass}>
              <option value="all">All categories</option>
              {categories.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
        )}
        {productNames.length > 0 && (
          <label>
            <span className="mb-1.5 block text-xs font-semibold text-osi-slate-300">Product</span>
            <select aria-label="Filter by product" value={productName} onChange={(event) => updateQuery({ product: event.target.value })} className={selectClass}>
              <option value="all">All products</option>
              {productNames.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
        )}
      </div>

      <p role="status" aria-live="polite" className="mb-5 text-sm text-osi-slate-300">
        {filtered.length} {filtered.length === 1 ? "resource" : "resources"}
      </p>

      {filtered.length > 0 ? (
        <ul className="grid gap-4 md:grid-cols-2">
          {filtered.map((resource) => (
            <li key={resource.id} className="flex min-h-48 flex-col rounded-[var(--site-radius-md)] border border-[var(--site-border)] bg-[var(--site-surface-raised)] p-5 text-osi-navy-900">
              <p className="text-xs font-semibold tracking-[0.1em] text-osi-gold-700 uppercase">{KIND_LABELS[resource.kind] ?? resource.kind}</p>
              <h3 className="mt-1 font-editorial text-xl font-semibold leading-tight text-balance">{resource.title}</h3>
              {resource.productName && <p className="mt-2 text-sm text-osi-slate-300">For {resource.productName}</p>}
              <a
                href={resource.fileUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Download"
                className="mt-auto inline-flex min-h-11 items-center gap-2 pt-5 text-sm font-semibold"
              >
                Open resource <span aria-hidden className="text-osi-gold-700">↗</span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="No resources match those filters."
          description="Clear the active filters to return to the complete resource library."
          action={
            <button
              type="button"
              onClick={() => updateQuery({ type: null, category: null, product: null })}
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
