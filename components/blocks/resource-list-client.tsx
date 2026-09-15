"use client";

import {
  ResourceBrowserClient,
  type ResourceBrowserItem,
} from "@/components/blocks/resource-browser-client";

export type ResourceListItem = ResourceBrowserItem;

export function ResourceListClient({ resources, emptyStateMessage }: { resources: ResourceListItem[]; emptyStateMessage: string }) {
  return <ResourceBrowserClient resources={resources} emptyStateMessage={emptyStateMessage} />;
}
