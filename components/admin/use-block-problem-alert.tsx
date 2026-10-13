"use client";

import { useCallback } from "react";
import { useAlertDialog } from "@/components/admin/ui/alert-dialog";

export type SaveProblem = { message: string; blockIndex?: number; field?: string; conflict?: boolean };

/**
 * One place that decides how a failed save looks in the page, shared-section
 * and product editors. A problem with a specific block (or any validation
 * error) opens a real alert dialog — with "Go to block" when it points at one
 * — instead of a line of text at the top of a long page. Version conflicts
 * return `false` so the caller keeps its banner, which carries the
 * "Reload page" action.
 */
export function useSaveProblemAlert(reveal?: (problem: SaveProblem) => void) {
  const { alert, dialog } = useAlertDialog();

  const reportProblem = useCallback(
    async (problem: SaveProblem): Promise<boolean> => {
      if (problem.conflict) return false;
      const pointsAtBlock = problem.blockIndex !== undefined && Boolean(reveal);
      const outcome = await alert({
        tone: pointsAtBlock ? "warning" : "error",
        title: pointsAtBlock ? "This block can't be saved yet" : "Couldn't save",
        message: problem.message,
        actionLabel: pointsAtBlock ? "Go to block" : undefined,
      });
      if (outcome === "action") reveal?.(problem);
      return true;
    },
    [alert, reveal],
  );

  return { reportProblem, alertDialog: dialog };
}
