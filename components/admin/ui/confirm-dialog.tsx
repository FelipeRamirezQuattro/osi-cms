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
import { Button } from "./button";
import { Input } from "./input";

/**
 * Accessible replacement for every `window.confirm()`/`window.prompt()`
 * call in the admin (Task 12) — a native `<dialog>` via `showModal()`,
 * same portal-to-`document.body` + "is this the client" pattern as
 * `components/admin/media-picker.tsx` (native dialogs get a real focus
 * trap for free; a from-scratch one is exactly what CLAUDE.md says not to
 * build). Unlike `window.confirm`/`window.prompt`, this can show
 * consequences (a bullet list of what a destructive action will do) and
 * validate a prompt's input inline instead of silently accepting garbage.
 *
 * Usage: render `{dialog}` once per screen (from `useConfirmDialog()`),
 * then `await confirm({...})` / `await prompt({...})` from an event
 * handler — both resolve once the user answers, exactly like the native
 * functions they replace, but async instead of blocking the main thread.
 */

function subscribeNoop() {
  return () => {};
}
function getClientSnapshot() {
  return true;
}
function getServerSnapshot() {
  return false;
}

export type ConfirmOptions = {
  title: string;
  message?: ReactNode;
  /** Bullet points spelling out what will happen — e.g. "3 pages reference this product". */
  consequences?: string[];
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  /**
   * Omits the Cancel button entirely — for a pure acknowledgment (an
   * accessible `window.alert()` replacement, e.g. the product-categories
   * change-impact guard in entity-list.tsx) rather than a real yes/no
   * choice. Escape/backdrop dismissal still resolves `false` in this
   * mode since there's nothing to "confirm" either way.
   */
  hideCancel?: boolean;
};

export type PromptOptions = {
  title: string;
  message?: ReactNode;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Return an error message to block submission, or null when the value is valid. Omit to accept anything, including empty. */
  validate?: (value: string) => string | null;
};

export type ConfirmDialogHandle = {
  /** Resolves `true` on confirm, `false` on cancel/dismiss. */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** Resolves the entered string on confirm, `null` on cancel/dismiss. */
  prompt: (options: PromptOptions) => Promise<string | null>;
};

type PendingState =
  | { kind: "confirm"; options: ConfirmOptions; resolve: (value: boolean) => void }
  | { kind: "prompt"; options: PromptOptions; resolve: (value: string | null) => void };

export const ConfirmDialog = forwardRef<ConfirmDialogHandle, object>(
  function ConfirmDialog(_props, ref) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [pending, setPending] = useState<PendingState | null>(null);
    const [inputValue, setInputValue] = useState("");
    const [inputError, setInputError] = useState<string | null>(null);
    const mounted = useSyncExternalStore(subscribeNoop, getClientSnapshot, getServerSnapshot);

    // Resolves the outstanding promise (if any) and closes the dialog.
    // Reads `current` from the setState updater rather than the outer
    // `pending` closure so a button click's direct settle() and the native
    // "close" event that its own dialogRef.current.close() call triggers
    // synchronously right after never resolve the same promise twice: React
    // applies these two setPending calls in order, and the second one sees
    // `current === null` (already cleared by the first) and no-ops.
    const settle = useCallback((value: boolean | string | null) => {
      setPending((current) => {
        if (!current) return current;
        if (current.kind === "confirm") {
          current.resolve(Boolean(value));
        } else {
          current.resolve(typeof value === "string" ? value : null);
        }
        return null;
      });
      dialogRef.current?.close();
    }, []);

    const confirm = useCallback((options: ConfirmOptions) => {
      return new Promise<boolean>((resolve) => {
        setInputError(null);
        setPending({ kind: "confirm", options, resolve });
        dialogRef.current?.showModal();
      });
    }, []);

    const prompt = useCallback((options: PromptOptions) => {
      return new Promise<string | null>((resolve) => {
        setInputValue(options.defaultValue ?? "");
        setInputError(null);
        setPending({ kind: "prompt", options, resolve });
        dialogRef.current?.showModal();
      });
    }, []);

    useImperativeHandle(ref, () => ({ confirm, prompt }), [confirm, prompt]);

    function handleConfirmClick() {
      if (!pending) return;
      if (pending.kind === "prompt") {
        const error = pending.options.validate?.(inputValue) ?? null;
        if (error) {
          setInputError(error);
          return;
        }
        settle(inputValue);
      } else {
        settle(true);
      }
    }

    function handleCancelClick() {
      settle(pending?.kind === "prompt" ? null : false);
    }

    // Fires on Escape/backdrop dismissal, and (harmlessly, per settle's own
    // comment) on the imperative close() call settle() already made.
    function handleNativeClose() {
      settle(pending?.kind === "prompt" ? null : false);
    }

    if (!mounted) return null;

    const tone = pending?.kind === "confirm" ? (pending.options.tone ?? "default") : "default";
    const hideCancel = pending?.kind === "confirm" && Boolean(pending.options.hideCancel);
    const titleId = "confirm-dialog-title";
    const messageId = "confirm-dialog-message";
    const errorId = "confirm-dialog-input-error";

    return createPortal(
      <dialog
        ref={dialogRef}
        onClose={handleNativeClose}
        aria-labelledby={titleId}
        aria-describedby={pending?.options.message ? messageId : undefined}
        className="admin-card w-[90vw] max-w-md rounded-[var(--admin-radius-dialog)] p-0 shadow-[var(--admin-shadow-floating)] backdrop:bg-slate-950/50"
      >
        {pending && (
          <div className="space-y-4 p-5">
            <h2 id={titleId} className="text-lg font-semibold tracking-tight">
              {pending.options.title}
            </h2>

            {pending.options.message && (
              <p id={messageId} className="text-sm text-[var(--admin-ink-secondary)]">
                {pending.options.message}
              </p>
            )}

            {pending.kind === "confirm" &&
              pending.options.consequences &&
              pending.options.consequences.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--admin-ink-secondary)]">
                  {pending.options.consequences.map((consequence, index) => (
                    <li key={index}>{consequence}</li>
                  ))}
                </ul>
              )}

            {pending.kind === "prompt" && (
              <label className="block space-y-1 text-sm">
                <span className="admin-field-label">{pending.options.label}</span>
                <Input
                  autoFocus
                  value={inputValue}
                  placeholder={pending.options.placeholder}
                  aria-invalid={inputError ? true : undefined}
                  aria-describedby={inputError ? errorId : undefined}
                  onChange={(event) => {
                    setInputValue(event.target.value);
                    if (inputError) setInputError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleConfirmClick();
                    }
                  }}
                />
                {inputError && (
                  <span id={errorId} role="alert" className="block text-xs text-red-600">
                    {inputError}
                  </span>
                )}
              </label>
            )}

            <div className="flex justify-end gap-2 pt-1">
              {!hideCancel && (
                <Button variant="secondary" onClick={handleCancelClick}>
                  {pending.options.cancelLabel ?? "Cancel"}
                </Button>
              )}
              <Button
                variant={tone === "danger" ? "danger" : "primary"}
                onClick={handleConfirmClick}
                autoFocus={hideCancel}
              >
                {pending.options.confirmLabel ?? (pending.kind === "prompt" ? "OK" : "Confirm")}
              </Button>
            </div>
          </div>
        )}
      </dialog>,
      document.querySelector(".admin-root") ?? document.body,
    );
  },
);

/** Convenience hook: owns the ref, hands back bound `confirm`/`prompt` functions plus the `dialog` element to render once. */
export function useConfirmDialog() {
  const ref = useRef<ConfirmDialogHandle>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return ref.current?.confirm(options) ?? Promise.resolve(false);
  }, []);

  const prompt = useCallback((options: PromptOptions) => {
    return ref.current?.prompt(options) ?? Promise.resolve(null);
  }, []);

  // `ref` is a stable useRef object, so this element only needs to be built once.
  const dialog = useMemo(() => <ConfirmDialog ref={ref} />, [ref]);

  return { confirm, prompt, dialog };
}
