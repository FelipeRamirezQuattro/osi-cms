"use server";

import { requireCapability } from "@/lib/auth";
import { listAuditActors, listAuditFacets, listAuditLog, type AuditLogEntry, type AuditLogFilters } from "@/lib/data/audit";

export async function listAuditLogAction(filters: AuditLogFilters): Promise<AuditLogEntry[]> {
  await requireCapability("view_audit");
  return listAuditLog(filters);
}

export async function listAuditFiltersAction(): Promise<{
  actors: { id: string; email: string }[];
  entities: string[];
  actions: string[];
}> {
  await requireCapability("view_audit");
  const [actors, facets] = await Promise.all([listAuditActors(), listAuditFacets()]);
  return { actors, entities: facets.entities, actions: facets.actions };
}
