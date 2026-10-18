"use client";

export type RevisionSummary = { id: string; created_at: string };

/**
 * The page editor's version-history sidebar. Always rendered — a panel
 * that only appears once a revision exists looked like missing
 * functionality (PAG-09). A revision is snapshotted on each publish, and
 * the parent re-reads the list via router.refresh() after publish/restore.
 */
export function RevisionsPanel({
  revisions,
  onRestore,
  canRestore = true,
}: {
  revisions: RevisionSummary[];
  onRestore: (revisionId: string) => void;
  canRestore?: boolean;
}) {
  return (
    <section className="space-y-2 rounded border border-osi-sand-300 bg-osi-white p-4" aria-labelledby="revisions-heading">
      <h2 id="revisions-heading" className="font-display text-xs tracking-wide-display uppercase opacity-70">
        Version history ({revisions.length})
      </h2>
      {revisions.length === 0 ? (
        <p className="text-xs opacity-70">Versions are saved each time you publish.</p>
      ) : (
        <ul className="max-h-48 space-y-1 overflow-y-auto text-xs">
          {revisions.map((rev) => (
            <li key={rev.id} className="flex items-center justify-between gap-2">
              <span className="opacity-70">{new Date(rev.created_at).toLocaleString()}</span>
              {canRestore && (
                <button type="button" onClick={() => onRestore(rev.id)} className="hover:underline">
                  Restore
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
