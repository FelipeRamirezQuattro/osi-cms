import { FormDefinitionEditor } from "@/app/admin/(dashboard)/forms/form-definition-editor";

export const dynamic = "force-dynamic";

export default function NewFormDefinitionPage() {
  return <FormDefinitionEditor definition={null} />;
}
