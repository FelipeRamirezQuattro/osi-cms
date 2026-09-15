import type { ReactNode } from "react";

export type AsyncMessageState = { kind: "success" | "error"; text: string } | null;

/**
 * The success/error line every save form shows below its fields — plain
 * text in the simple product/entity/settings/form-definition editors, or
 * paired with a "Reload page" `action` for the page/shared-section
 * editors' optimistic-concurrency conflict banner.
 */
export function AsyncMessage({ message, action }: { message: AsyncMessageState; action?: ReactNode }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-3">
      <p className={message.kind === "error" ? "text-sm text-red-600" : "text-sm text-green-700"}>{message.text}</p>
      {action}
    </div>
  );
}
