import { notFound } from "next/navigation";
import { ENTITY_CONFIGS, isEntityKey } from "@/lib/admin/entity-config";
import { getRelationOptionsAction } from "@/lib/actions/entities";
import { EntityEditor } from "@/app/admin/(dashboard)/[entity]/entity-editor";

export const dynamic = "force-dynamic";

export default async function NewEntityPage({ params }: PageProps<"/admin/[entity]/new">) {
  const { entity } = await params;
  if (!isEntityKey(entity)) notFound();

  const config = ENTITY_CONFIGS[entity];
  const relationOptions = await getRelationOptionsAction(entity);

  return <EntityEditor entity={entity} config={config} row={null} relationOptions={relationOptions} />;
}
