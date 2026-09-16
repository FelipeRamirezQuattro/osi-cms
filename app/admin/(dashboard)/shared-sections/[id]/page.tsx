import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getSharedSectionById } from "@/lib/data/shared-sections";
import { getBlockPalette } from "@/lib/blocks/registry";
import { SharedSectionEditor } from "@/app/admin/(dashboard)/shared-sections/[id]/shared-section-editor";
import { getPublishedBranding } from "@/lib/data/branding";
import { OSI_SEED_BRANDING_CONFIG } from "@/lib/branding/seed";
import { PublishedBrandingOptionsProvider } from "@/components/admin/block-appearance-fields";

export const dynamic = "force-dynamic";

// Not using the generated `PageProps<"/admin/shared-sections/[id]">`
// helper — same reasoning as app/admin/(dashboard)/forms/[id]/page.tsx.
export default async function EditSharedSectionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  const { id } = await params;
  const section = await getSharedSectionById(id);
  if (!section) notFound();

  const [palette, branding] = await Promise.all([getBlockPalette(), getPublishedBranding()]);

  return <PublishedBrandingOptionsProvider branding={branding?.config ?? OSI_SEED_BRANDING_CONFIG}><SharedSectionEditor section={section} palette={palette} role={session.role} /></PublishedBrandingOptionsProvider>;
}
