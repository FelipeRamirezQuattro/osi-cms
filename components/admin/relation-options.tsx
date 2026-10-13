"use client";

import { createContext, useContext } from "react";

export type RelationOption = { value: string; label: string };
export type RelationOptionsMap = Record<string, RelationOption[]>;

const RelationOptionsContext = createContext<RelationOptionsMap>({});

export function RelationOptionsProvider({
  options,
  children,
}: {
  options: RelationOptionsMap;
  children: React.ReactNode;
}) {
  return <RelationOptionsContext.Provider value={options}>{children}</RelationOptionsContext.Provider>;
}

export function useRelationOptions(relation: string): RelationOption[] {
  const map = useContext(RelationOptionsContext);
  return map[relation] ?? [];
}

/**
 * Where to create the records a relation picker lists, so an empty picker
 * says what to do instead of "No options available." Relations not listed
 * here (e.g. `related_products`) keep a plain empty message.
 */
const RELATION_ADMIN_LINKS: Record<string, { noun: string; href: string; section: string }> = {
  industries: { noun: "industries", href: "/admin/industries", section: "Industries" },
  applications: { noun: "applications", href: "/admin/applications", section: "Applications" },
  "shared-sections": { noun: "shared sections", href: "/admin/shared-sections", section: "Shared sections" },
  products: { noun: "products", href: "/admin/products", section: "Products" },
  locations: { noun: "locations", href: "/admin/locations", section: "Locations" },
};

export function RelationEmptyState({ relation }: { relation: string }) {
  const link = RELATION_ADMIN_LINKS[relation];
  if (!link) return <p className="text-xs text-osi-slate-400">No options available.</p>;
  return (
    <p className="text-xs text-osi-slate-400">
      No {link.noun} yet — create them in{" "}
      <a href={link.href} className="underline">
        {link.section} →
      </a>
    </p>
  );
}
