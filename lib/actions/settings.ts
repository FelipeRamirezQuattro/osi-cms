"use server";

import { requireCapability } from "@/lib/auth";
import { getSiteSettings, updateSiteSettings } from "@/lib/data/settings";
import type { Tables } from "@/lib/db/database.types";

export async function getSettingsAction(): Promise<Tables<"site_settings">> {
  await requireCapability("manage_settings");
  return getSiteSettings();
}

export type SaveSettingsResult = { status: "success" } | { status: "error"; message: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function saveSettingsAction(values: any): Promise<SaveSettingsResult> {
  await requireCapability("manage_settings");
  try {
    await updateSiteSettings({
      ...values,
      address_lines: (values.address_lines ?? []).filter((line: string) => line.trim() !== ""),
    });
    return { status: "success" };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Save failed." };
  }
}
