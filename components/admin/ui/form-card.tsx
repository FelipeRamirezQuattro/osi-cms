import type { FormEvent, ReactNode } from "react";
import Link from "next/link";

/**
 * The outer save/error chrome repeated by product-editor.tsx,
 * entity-editor.tsx, form-definition-editor.tsx, and settings-form.tsx:
 * a title row with an optional "Delete" button, wrapping a bordered form
 * card. Only the chrome is shared — each of those keeps its own
 * `FieldSpec[]`-driven field list as children, per CLAUDE.md's ruling
 * that page blocks / product child-table editors stay separate from this
 * (page-editor.tsx and shared-section-editor.tsx use `AdminPageHeader` +
 * `AsyncMessage` directly instead, since their header has a status badge
 * and publish/unpublish buttons this simple title-row doesn't need).
 *
 * `backHref` (Task 13a) doubles as this form's "Cancel" control — these
 * editors have no autosave, so navigating back to the list without
 * submitting already discards any unsaved edits, the same way
 * page-editor.tsx's `AdminPageHeader` back link works.
 */
export function FormCard({
  title,
  backHref,
  backLabel,
  onDelete,
  deleteLabel = "Delete",
  maxWidth = "max-w-3xl",
  onSubmit,
  children,
}: {
  title: ReactNode;
  backHref?: string;
  backLabel?: string;
  onDelete?: () => void;
  deleteLabel?: string;
  maxWidth?: string;
  onSubmit: (event: FormEvent) => void;
  children: ReactNode;
}) {
  return (
    <div className={`${maxWidth} space-y-6 pb-16`}>
      <div>
        {backHref && (
          <Link href={backHref} className="block text-xs opacity-60 hover:underline">
            ← {backLabel ?? "Cancel"}
          </Link>
        )}
        <div className="flex items-center justify-between">
          <h1 className="font-display text-lg tracking-wide-display uppercase">{title}</h1>
          {onDelete && (
            <button type="button" onClick={onDelete} className="text-xs text-red-600 hover:underline">
              {deleteLabel}
            </button>
          )}
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded border border-osi-sand-300 bg-osi-white p-5">
        {children}
      </form>
    </div>
  );
}

/** The consistent primary submit button ("Save" / "Saving…") every FormCard-based form ends with. */
export function SubmitButton({
  pending,
  children = "Save",
  pendingLabel = "Saving…",
}: {
  pending: boolean;
  children?: ReactNode;
  pendingLabel?: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-osi-navy-900 px-4 py-2 text-xs uppercase tracking-wide-label text-osi-white disabled:opacity-50"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
