"use client";

import { useSyncExternalStore } from "react";
import { LabelPlateGrid, type LabelPlateItem } from "@/components/blocks/label-plate-grid";
import { productHref } from "@/lib/routes";

export interface RecommendableProduct {
  slug: string;
  name: string;
  summary: string | null;
  categorySlug: string | null;
}

function toItem(p: RecommendableProduct): LabelPlateItem {
  return {
    title: p.name,
    body: p.summary ?? undefined,
    href: p.categorySlug ? productHref(p.categorySlug, p.slug) : "/products",
  };
}

function subscribeToNothing() {
  // localStorage doesn't emit events for same-tab writes, and this
  // block never writes to it itself — nothing to subscribe to.
  return () => {};
}

function getViewedSlugs(): string[] {
  try {
    return JSON.parse(localStorage.getItem("osi:viewed") ?? "[]");
  } catch {
    return [];
  }
}

function getServerSnapshot(): string[] {
  return [];
}

// Reads recently-viewed product slugs from localStorage (written by the
// product detail page) via useSyncExternalStore — the React-recommended
// way to read external mutable state without a setState-in-effect
// cascade. Server snapshot is empty, so SSR and first paint render the
// same fallback list; the real read only happens on the client.
export function RecommendationsClient({
  fallback,
  limit = 4,
}: {
  fallback: RecommendableProduct[];
  limit?: number;
}) {
  const viewedSlugs = useSyncExternalStore(subscribeToNothing, getViewedSlugs, getServerSnapshot);

  const bySlug = new Map(fallback.map((p) => [p.slug, p]));
  const viewed = viewedSlugs
    .map((slug) => bySlug.get(slug))
    .filter((p): p is RecommendableProduct => !!p);

  const items = (viewed.length > 0 ? viewed : fallback).slice(0, limit).map(toItem);
  if (items.length === 0) return null;
  return <LabelPlateGrid items={items} />;
}
