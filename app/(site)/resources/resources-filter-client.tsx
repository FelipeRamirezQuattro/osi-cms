"use client";

import { useMemo, useState } from "react";

export type ResourceItem = {
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

// Small table (see Task 8 report — 0 rows live at the time this was
// built), so one server fetch (app/(site)/resources/page.tsx) filtered
// client-side is simpler than three separate server round-trips per
// filter combination, per the controller's ruling for this item.
export function ResourcesFilterClient({ resources }: { resources: ResourceItem[] }) {
  const [kind, setKind] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [productName, setProductName] = useState<string>("all");

  const kinds = useMemo(() => [...new Set(resources.map((r) => r.kind))].sort(), [resources]);
  const categories = useMemo(
    () => [...new Set(resources.map((r) => r.category).filter((c): c is string => Boolean(c)))].sort(),
    [resources],
  );
  const productNames = useMemo(
    () => [...new Set(resources.map((r) => r.productName).filter((p): p is string => Boolean(p)))].sort(),
    [resources],
  );

  const filtered = resources.filter(
    (r) =>
      (kind === "all" || r.kind === kind) &&
      (category === "all" || r.category === category) &&
      (productName === "all" || r.productName === productName),
  );

  return (
    <div>
      <div className="mb-8 flex flex-wrap gap-4">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          aria-label="Filter by type"
          className="rounded border border-osi-sand-300 bg-osi-white px-3 py-2 text-sm"
        >
          <option value="all">All types</option>
          {kinds.map((k) => (
            <option key={k} value={k}>
              {KIND_LABELS[k] ?? k}
            </option>
          ))}
        </select>
        {categories.length > 0 && (
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Filter by category"
            className="rounded border border-osi-sand-300 bg-osi-white px-3 py-2 text-sm"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
        {productNames.length > 0 && (
          <select
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            aria-label="Filter by product"
            className="rounded border border-osi-sand-300 bg-osi-white px-3 py-2 text-sm"
          >
            <option value="all">All products</option>
            {productNames.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        )}
      </div>

      {filtered.length > 0 ? (
        <ul className="divide-y divide-osi-sand-300/40">
          {filtered.map((resource) => (
            <li key={resource.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div>
                <p className="text-xs uppercase tracking-wide-label text-osi-gold-700">
                  {KIND_LABELS[resource.kind] ?? resource.kind}
                </p>
                <h2 className="font-display text-card-label tracking-wide-display uppercase">{resource.title}</h2>
                {resource.productName && <p className="mt-1 text-sm opacity-70">{resource.productName}</p>}
              </div>
              <a
                href={resource.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="font-display text-sm tracking-wide-display uppercase underline underline-offset-4 hover:opacity-80"
              >
                Download
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-osi-slate-400">No resources match those filters.</p>
      )}
    </div>
  );
}
