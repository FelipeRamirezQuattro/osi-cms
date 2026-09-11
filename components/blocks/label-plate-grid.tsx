"use client";

import { useState } from "react";
import { LabelPlateCard } from "@/components/ui/label-plate-card";

export interface LabelPlateItem {
  title: string;
  body?: string;
  href?: string;
  imageUrl?: string;
}

// Shared "one card open per grid" interaction (mockup motif 4) used by
// feature_tiles, product_grid, and recommendations.
export function LabelPlateGrid({
  items,
  defaultOpenIndex = 0,
  columns = 4,
}: {
  items: LabelPlateItem[];
  defaultOpenIndex?: number;
  columns?: 2 | 3 | 4;
}) {
  const [openIndex, setOpenIndex] = useState(defaultOpenIndex);
  const colsClass =
    columns === 2 ? "sm:grid-cols-2" : columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-4";

  return (
    <div className={`grid grid-cols-2 gap-4 ${colsClass}`}>
      {items.map((item, i) => (
        <LabelPlateCard
          key={item.title + i}
          title={item.title}
          body={item.body}
          href={item.href}
          image={item.imageUrl}
          open={openIndex === i}
          onInteract={() => setOpenIndex(i)}
        />
      ))}
    </div>
  );
}
