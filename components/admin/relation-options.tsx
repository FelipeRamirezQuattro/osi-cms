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
