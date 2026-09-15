import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getFormDefinitionAction } from "@/lib/actions/forms";
import { FormDefinitionEditor } from "@/app/admin/(dashboard)/forms/form-definition-editor";

export const dynamic = "force-dynamic";

// Not using the generated `PageProps<"/admin/forms/[id]">` helper here —
// this route is new in this change and the generated route-type map
// (produced by `next typegen`) may not have picked it up yet in every
// environment this runs in; a manually-written async params type is
// exactly what that helper expands to anyway (see AGENTS.md).
export default async function EditFormDefinitionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  const { id } = await params;
  const definition = await getFormDefinitionAction(id);
  if (!definition) notFound();

  return <FormDefinitionEditor definition={definition} role={session.role} />;
}
