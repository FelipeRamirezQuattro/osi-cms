"use server";

import { requireCapability } from "@/lib/auth";
import { getSiteSettings, updateSiteSettings } from "@/lib/data/settings";
import type { Tables } from "@/lib/db/database.types";
import { formatZodError } from "@/lib/validation/common";
import { siteSettingsSchema } from "@/lib/validation/settings";

export async function getSettingsAction(): Promise<Tables<"site_settings">> {
  await requireCapability("manage_settings");
  return getSiteSettings();
}

export type SaveSettingsResult = { status: "success" } | { status: "error"; message: string; field?: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function saveSettingsAction(values: any): Promise<SaveSettingsResult> {
  await requireCapability("manage_settings");

  const parsed = siteSettingsSchema.safeParse({
    ...values,
    address_lines: (values.address_lines ?? []).filter((line: string) => line.trim() !== ""),
  });
  if (!parsed.success) {
    const { message, field } = formatZodError(parsed.error);
    return { status: "error", message, field };
  }

  try {
    await updateSiteSettings(parsed.data);
    return { status: "success" };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Save failed." };
  }
}
