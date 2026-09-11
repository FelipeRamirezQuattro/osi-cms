import { NewPageForm } from "@/app/admin/(dashboard)/pages/new/new-page-form";

export default function NewPagePage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-lg tracking-wide-display uppercase">New page</h1>
      <NewPageForm />
    </div>
  );
}
