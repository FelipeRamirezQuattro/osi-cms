import type { ReactNode } from "react";

export type AsyncMessageState = { kind: "success" | "error"; text: string } | null;

/**
 * The success/error line every save form shows below its fields — plain
 * text in the simple product/entity/settings/form-definition editors, or
 * paired with a "Reload page" `action` for the page/shared-section
 * editors' optimistic-concurrency conflict banner.
 *
 * `aria-live="polite"` on the wrapper (always rendered, even with no
 * message yet) is what makes this a real screen-reader announcement
 * rather than a silent DOM update — a live region only announces content
 * that changes *after* it's already present in the accessibility tree,
 * so the region has to exist before the message does, not be mounted
 * along with it (an `if (!message) return null` bail-out, as this
 * component had before, means the live region itself is created at the
 * same moment as its first message and most screen readers miss that
 * first announcement entirely). Every save/upload/validate/login/submit
 * flow in the admin (and the public contact form) should route its
 * status through this component rather than a plain conditionally-
 * rendered `<p>`.
 */
export function AsyncMessage({
  message,
  action,
  variant = "light",
}: {
  message: AsyncMessageState;
  action?: ReactNode;
  /**
   * "light" (default) is tuned for the admin's white/cream form cards.
   * "dark" swaps in a brighter red/green pair for the navy-800 auth
   * forms (login/forgot-password) — red-600/green-700 (the "light"
   * pair) sit close enough to navy-800 in luminance to read as low-
   * contrast there, the same reason the pre-Task-14 login form used
   * text-red-400 specifically instead of the shared admin error color.
   */
  variant?: "light" | "dark";
}) {
  const errorClass = variant === "dark" ? "text-red-400" : "text-red-600";
  const successClass = variant === "dark" ? "text-green-400" : "text-green-700";
  return (
    <div aria-live="polite" role="status" className={message ? "flex items-center gap-3" : undefined}>
      {message && (
        <>
          <p className={`text-sm ${message.kind === "error" ? errorClass : successClass}`}>{message.text}</p>
          {action}
        </>
      )}
    </div>
  );
}
