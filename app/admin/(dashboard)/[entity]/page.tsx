import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { ENTITY_CONFIGS, isEntityKey } from "@/lib/admin/entity-config";
import { listEntitiesAction } from "@/lib/actions/entities";
import { EntityList } from "@/app/admin/(dashboard)/[entity]/entity-list";

export const dynamic = "force-dynamic";

export default async function EntityListPage({ params }: PageProps<"/admin/[entity]">) {
  const { entity } = await params;
  if (!isEntityKey(entity)) notFound();

  const session = await requireAdmin();
  const config = ENTITY_CONFIGS[entity];
  const rows = await listEntitiesAction(entity);

  return <EntityList entity={entity} config={config} initialRows={rows} role={session.role} />;
}
