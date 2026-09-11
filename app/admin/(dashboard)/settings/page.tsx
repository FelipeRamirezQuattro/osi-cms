import { getSettingsAction } from "@/lib/actions/settings";
import { SettingsForm } from "@/app/admin/(dashboard)/settings/settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettingsAction();
  return <SettingsForm settings={settings} />;
}
