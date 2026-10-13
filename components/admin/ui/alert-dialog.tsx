"use client";

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AlertIcon, type AlertTone } from "./alert";
import { Button } from "./button";

/**
 * A modal alert for "something is wrong and you need to deal with it before
 * continuing" — e.g. a block that failed validation when the page was saved.
 * Replaces a single red line at the top of a long editor page (easy to miss,
 * often scrolled out of view) and is never a browser `alert()`. Same native
 * `<dialog>` + admin-root portal as ConfirmDialog (free focus trap, Escape to
 * close). `await alert({...})` resolves "action" when the primary button was
 * used (e.g. "Go to block") and "close" otherwise.
 *
 * Usage: render `{dialog}` once per screen from `useAlertDialog()`.
 */

function subscribeNoop() {
  return () => {};
}

export type AlertDialogOptions = {
  tone?: Exclude<AlertTone, "success">;
  title: string;
  message?: ReactNode;
  /** One line per problem. */
  details?: string[];
  /** Primary button; omit for a plain acknowledgement. */
  actionLabel?: string;
  closeLabel?: string;
};

export type AlertDialogResult = "action" | "close";
export type AlertDialogHandle = { alert: (options: AlertDialogOptions) => Promise<AlertDialogResult> };

type Pending = { options: AlertDialogOptions; resolve: (r: AlertDialogResult) => void };

export const AlertDialog = forwardRef<AlertDialogHandle, object>(function AlertDialog(_props, ref) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);

  // Same single-resolution guard as ConfirmDialog.settle: the click and the native "close" event it triggers both land here.
  const settle = useCallback((result: AlertDialogResult) => {
    setPending((current) => {
      current?.resolve(result);
      return null;
    });
    dialogRef.current?.close();
  }, []);

  const alert = useCallback((options: AlertDialogOptions) => {
    return new Promise<AlertDialogResult>((resolve) => {
      setPending({ options, resolve });
      dialogRef.current?.showModal();
    });
  }, []);

  useImperativeHandle(ref, () => ({ alert }), [alert]);

  if (!mounted) return null;
  const tone = pending?.options.tone ?? "error";
  const titleId = "alert-dialog-title";

  return createPortal(
    <dialog
      ref={dialogRef}
      onClose={() => settle("close")}
      aria-labelledby={titleId}
      role="alertdialog"
      className="admin-modal admin-card w-[calc(100vw-1rem)] max-w-md overflow-y-auto rounded-[var(--admin-radius-dialog)] p-0 shadow-[var(--admin-shadow-floating)] backdrop:bg-slate-950/50 sm:w-[90vw]"
    >
      {pending && (
        <div className="space-y-4 p-5" data-alert-tone={tone}>
          <div className="flex items-start gap-3">
            <AlertIcon tone={tone} />
            <div className="min-w-0 flex-1 space-y-2">
              <h2 id={titleId} className="text-lg font-semibold tracking-tight">
                {pending.options.title}
              </h2>
              {pending.options.message && <p className="text-sm text-[var(--admin-ink-secondary)]">{pending.options.message}</p>}
              {pending.options.details && pending.options.details.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--admin-ink-secondary)]">
                  {pending.options.details.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => settle("close")} autoFocus={!pending.options.actionLabel}>
              {pending.options.closeLabel ?? (pending.options.actionLabel ? "Close" : "OK")}
            </Button>
            {pending.options.actionLabel && (
              <Button onClick={() => settle("action")} autoFocus>
                {pending.options.actionLabel}
              </Button>
            )}
          </div>
        </div>
      )}
    </dialog>,
    document.querySelector(".admin-root") ?? document.body,
  );
});

/** Owns the ref; hands back a bound `alert` plus the `dialog` element to render once. */
export function useAlertDialog() {
  const ref = useRef<AlertDialogHandle>(null);
  const alert = useCallback((options: AlertDialogOptions) => ref.current?.alert(options) ?? Promise.resolve<AlertDialogResult>("close"), []);
  const dialog = useMemo(() => <AlertDialog ref={ref} />, [ref]);
  return { alert, dialog };
}
