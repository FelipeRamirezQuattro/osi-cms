# Backup & restore

Two different recovery paths exist for two different kinds of loss —
"an editor wants an older version of a page back" and "something at the
database level needs restoring." They're documented separately below
because they're solved by completely different mechanisms.

## Recovering a page (in-app, self-service)

Every **Publish** snapshots the page's full `{ meta, blocks }` state into
`page_revisions` before flipping `pages.status` to `published`
(`publish_page_atomic`, `supabase/migrations/0017_publishing_permissions_atomic.sql`).
The page editor's **Revisions** panel (right sidebar,
`app/admin/(dashboard)/pages/[id]/page-editor.tsx`) lists up to the 20
most recent snapshots with a **Restore** link next to each one.

Clicking **Restore**:

1. Calls `restoreRevisionAction` → `restorePageRevision`
   (`lib/data/pages.ts`), which reads the chosen revision's stored
   snapshot from `page_revisions`.
2. Re-saves that snapshot's `meta`/`blocks` as the page's **current
   draft**, through the exact same `save_page_draft_atomic` RPC an
   ordinary **Save draft** click uses — including its optimistic-
   concurrency check (`expectedVersion`). There is no separate "restore"
   write path that could drift from how a normal save behaves.
3. Leaves the page's `status` untouched — restoring a revision never
   republishes by itself. If the page was already published, the editor
   still needs to click **Publish** again to make the restored content
   live (matching "restore only ever puts you back in an editable
   draft state," never a surprise live change).

This only recovers `pages` content (its blocks). It does **not** cover:

- **Deleting a page outright.** `delete_page_atomic` hard-deletes the
  row (system pages are excluded, see that function). There is no
  "undo delete" in-app — recovering a hard-deleted page requires the
  database-level restore described below.
- **Products.** `products` has no revision-history table at all —
  every product edit overwrites the row directly via
  `save_product_atomic` (`0022_product_and_reorder_atomic.sql`), with
  no snapshot step. Recovering a deleted product (or an earlier version
  of one, with its `product_benefits`/`product_stages`/`product_specs`
  children) is a database-level operation, not an in-app one — see
  below.
- Every other content table (`news_posts`, `resources`, `industries`,
  etc.) — same situation as products, no revision history.

### What was actually verified, and what wasn't

The restore *logic* — "loads the requested revision's snapshot and
re-saves it as the current draft via the same RPC a normal save uses" —
is covered by a real test against a fake Supabase-shaped client
(`lib/data/pages.test.ts`, the `restorePageRevision` describe block),
asserting the exact RPC name, arguments (including that `position` is
correctly dropped and re-derived from array order, and that
`expectedVersion` is threaded through for the concurrency check), and
return value.

**What was not done: a live, authenticated click-through of the
Revisions panel in a running `/admin` instance.** This implementer
environment has no seeded admin account, and the remediation plan's
standing rules forbid running `pnpm create-admin` or any seed script in
this session (the exact same wall Task 14's report documented for its
own authenticated-admin accessibility tests — see `docs/DECISIONS.md`'s
Task 14 entry). The code path, the RPC it calls, and the concurrency
check are unchanged from what Task 3 built and (per that task's own
report) exercised at the time; this task's contribution is the test
above plus this write-up, not a fresh manual QA pass. **A real
click-through — open a page with at least two published revisions,
restore an older one, confirm the draft content changes and the page's
`status` is untouched — is recommended before relying on this in a real
incident**, and is a fast, low-risk check for whoever next has an
authenticated admin session.

## Database-level restore (Supabase project backups)

For anything the in-app revisions panel doesn't cover — a hard-deleted
page, a deleted or badly-edited product and its children, a bad
migration, accidental data loss of any kind — the recovery mechanism is
Supabase's own project-level backup/restore, **not** anything built in
this repo.

**Current, actual state of this project's backup coverage (checked via
the Supabase MCP's `get_project`/`get_organization` tools against the
live `osi-cms` project, `ovuhuridnalxnzwggzru`, on 2026-09-15):**

- The Supabase organization this project lives in
  (`bvqvvtoaxhhangwdmekk`, "Freelancer") is on the **Free** plan.
- **Supabase's Free plan provisions no automated daily backups and no
  point-in-time recovery (PITR).** Both are paid-tier features: daily
  backups (7-day retention) come with the Pro plan and above; PITR is a
  further paid add-on on top of that.
- **This means: if `osi-cms`'s database were lost or corrupted today,
  there is currently no Supabase-managed backup to restore from.** This
  is a real, live gap — not a hypothetical one — and is worth flagging
  to the client/controller as its own decision, independent of this
  task's scope: either upgrade the Supabase organization to a paid plan
  (restoring the standard daily-backup/PITR safety net), or stand up a
  separate manual export routine (e.g. a scheduled `pg_dump` via the
  Supabase CLI/connection string, stored somewhere durable) until that
  upgrade happens. Building that export routine was judged out of scope
  for this task (no scheduled-job infrastructure exists in this stack
  today — see the archive-retention decision in `docs/DECISIONS.md`,
  which hits the same "no cron" wall) but is the natural next step if
  the Free-plan gap isn't closed by upgrading instead.

**If/when the project is on a plan with backups enabled**, the restore
path for a product (or anything else database-level) is the standard
Supabase one:

1. **Supabase dashboard** → the project → **Database → Backups** — pick
   a backup (or, with PITR, an exact timestamp) and restore either the
   whole project or use the dashboard's point-in-time restore-to-a-new-
   project flow, then reconcile/export just the rows that were lost
   (e.g. the one deleted product row plus its
   `product_benefits`/`product_stages`/`product_specs`/junction-table
   rows) back into the live project.
2. **Supabase CLI**, equivalently: `supabase db dump` against a restored
   project (or a direct `pg_dump`/`pg_restore` against the Postgres
   connection string from a backup) to extract just the needed rows,
   rather than overwriting the whole live database — a full-project
   restore is a last resort, not the default move, since it would also
   roll back every unrelated change made since the backup.

This was **not** tested end-to-end in this task (no backup exists to
restore from on the Free plan, so there was nothing to test against) —
the write-up above documents the mechanism Supabase provides once
backups exist, not a verified runbook.

## Manual export and restore (rehearsed 2026-10-20)

Until the Supabase organization is on a paid plan, `pnpm backup:export` is the
only database backup. It reads every `public` table through the service-role API
(SELECT only, nothing is written) and writes `backups/<timestamp>/` — one JSON
file per table, a `manifest.json` of row counts, and a self-contained
`restore.sql`. `backups/` is git-ignored because it holds personal data (form
submissions, subscribers); store the folder somewhere private and durable.

**Rehearsal on a throwaway target** (a local `postgres:17` container with stand-ins
for Supabase's `auth`/`storage` schemas and the `anon`/`authenticated`/`service_role`
roles), against the live database, 2026-10-20:

| Step | Result |
|---|---|
| `pnpm backup:export` | 45 tables, 8,217 rows, 8.7 MB, **11 s** |
| Replay migrations 0001–0053, 0055, 0056 on an empty database | 54 files, **5 s**, no failures |
| `psql -f restore.sql` | **1 s**; every table's row count equals `manifest.json` |
| Spot checks on the restored copy | 15 published pages, 3 published products, `redirect_index()` returns 91 rows, full-text search finds the same 18 products |
| One-time setup (pulling the Postgres image) | about 2 minutes |

To restore: create an empty database, apply `supabase/migrations/*.sql` in order
**except 0054**, then `psql -v ON_ERROR_STOP=1 -f backups/<timestamp>/restore.sql`.

**Gaps the rehearsal found** (none is fixed by the export alone):

1. **Admin accounts are not in the export.** `admin_profiles` (5 rows) points at
   `auth.users`, which the API does not expose, and password hashes cannot be
   exported this way. After a full loss every admin has to be re-invited
   (`pnpm create-admin <email>`) or reset their password.
2. **Uploaded files are not in the export.** `media_assets` (190 rows) stores URLs
   into the Supabase Storage bucket `media`; the files themselves need their own
   copy (download the bucket from the dashboard or with the CLI).
3. **Migration 0054 cannot be replayed on an empty database.** It validates that
   the products and pages its 77 redirects point to already exist and aborts if
   they don't. The redirect rows it created are part of the exported data, so the
   restore procedure skips it. (Anyone replaying migrations to build a *new*
   environment from scratch will hit the same abort and should load data first.)
4. **Loading needs triggers and foreign keys switched off** (`restore.sql` sets
   `session_replication_role = replica`), and a single `TRUNCATE` for all tables:
   truncating table by table with `CASCADE` silently empties child tables that were
   already loaded. Generated columns (`search_vector`) are skipped and recompute.
5. **Not rehearsed:** restoring into an actual Supabase project (RLS policies run
   against real Supabase roles there), restoring Storage files, and a Supabase-managed
   backup — none exists on the Free plan, as above.
6. **The export is on-demand.** Nothing runs it on a schedule. Run it by hand
   before every risky operation, in particular before the DNS change on go-live day
   (see `docs/LAUNCH-RUNBOOK.md`), and keep the last few.
