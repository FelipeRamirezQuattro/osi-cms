import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { ENTITY_CONFIGS, isEntityKey } from "@/lib/admin/entity-config";
import { getEntityAction, getRelationOptionsAction } from "@/lib/actions/entities";
import { EntityEditor } from "@/app/admin/(dashboard)/[entity]/entity-editor";

export const dynamic = "force-dynamic";

export default async function EditEntityPage({ params }: PageProps<"/admin/[entity]/[id]">) {
  const { entity, id } = await params;
  if (!isEntityKey(entity)) notFound();

  const session = await requireAdmin();
  const config = ENTITY_CONFIGS[entity];
  const [row, relationOptions] = await Promise.all([getEntityAction(entity, id), getRelationOptionsAction(entity)]);
  if (!row) notFound();

  return <EntityEditor entity={entity} config={config} row={row} relationOptions={relationOptions} role={session.role} />;
}
