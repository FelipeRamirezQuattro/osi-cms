"use server";

import { requireCapability } from "@/lib/auth";
import { listSavedReports, saveReport, unsaveReport } from "@/lib/data/saved-reports";

export async function listSavedReportsAction(): Promise<string[]> {
  await requireCapability("view_analytics");
  return listSavedReports();
}

export async function toggleSavedReportAction(reportKey: string, shouldSave: boolean): Promise<void> {
  await requireCapability("view_analytics");
  if (shouldSave) {
    await saveReport(reportKey);
  } else {
    await unsaveReport(reportKey);
  }
}
