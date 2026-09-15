import { LabelPlateCard } from "@/components/ui/label-plate-card";

export interface LabelPlateItem {
  title: string;
  body?: string;
  href?: string;
  imageUrl?: string;
}

/** Shared discovery grid used by product, feature, and recommendation surfaces. */
export function LabelPlateGrid({
  items,
  columns = 4,
}: {
  items: LabelPlateItem[];
  columns?: 2 | 3 | 4;
}) {
  const colsClass =
    columns === 2
      ? "sm:grid-cols-2"
      : columns === 3
        ? "sm:grid-cols-2 lg:grid-cols-3"
        : "sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div className={`grid grid-cols-1 gap-5 ${colsClass}`}>
      {items.map((item, index) => (
        <LabelPlateCard
          key={`${item.title}-${index}`}
          title={item.title}
          body={item.body}
          href={item.href}
          image={item.imageUrl}
        />
      ))}
    </div>
  );
}
