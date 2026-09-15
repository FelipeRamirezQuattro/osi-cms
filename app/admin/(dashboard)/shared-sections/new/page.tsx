import { NewSharedSectionForm } from "@/app/admin/(dashboard)/shared-sections/new/new-shared-section-form";

export default function NewSharedSectionPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-lg tracking-wide-display uppercase">New shared section</h1>
      <NewSharedSectionForm />
    </div>
  );
}
