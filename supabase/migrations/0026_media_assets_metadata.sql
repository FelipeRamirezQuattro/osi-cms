-- Task 11 (CMS audit remediation): richer media asset metadata so the
-- media library can store/edit alt, caption, credit, folder/tags, and a
-- replacement trail without forcing a re-upload (acceptance criterion:
-- "alt/metadata changes do not require re-uploading").
--
-- `filename` preserves the original uploaded name separately from
-- `title`, which staff can now rename freely in the library without
-- losing that provenance (lib/data/media.ts still falls back to the
-- original filename as the initial `title` on upload).
--
-- `decorative` mirrors the boolean the `image` block schema already
-- introduced (components/blocks/image.tsx, Task 9) — an explicit
-- alternative to a fake/empty alt string. Generalizing it to the
-- library level (rather than only the one block) is this task's job.
-- `alt`/`decorative` are not made mutually-exclusive at the database
-- level (no CHECK constraint) — the app-level rule ("alt required
-- unless decorative", lib/validation/media.ts) is enforced at every
-- write path (upload + metadata edit); a DB-level CHECK would also have
-- to tolerate the ~26 pre-existing legacy rows that predate this column
-- and have neither set, which isn't worth the trade-off for an MVP.
--
-- `tags`/`folder` back the library's filtering UI. `replaced_by` +
-- `replaced_at` record the outcome of the "replace everywhere, then
-- delete" flow (lib/data/media.ts `replaceMediaAssetEverywhere` /
-- `markMediaAssetReplaced`): when an admin replaces every reference to
-- an asset with a different one, the *old* row is stamped with what
-- replaced it before it's deleted, so a delete's audit_log entry
-- (already recorded via recordAudit) has a self-contained trail even
-- after the row itself is gone (the diff captured at delete time
-- includes replaced_by/replaced_at). `on delete set null` so deleting
-- the *newer* asset later doesn't fail or cascade into deleting the
-- (already-deleted, in the normal flow) older row's now-dangling
-- reference.
alter table media_assets
  add column if not exists filename text,
  add column if not exists caption text,
  add column if not exists credit text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists decorative boolean not null default false,
  add column if not exists file_size bigint,
  add column if not exists replaced_by uuid references media_assets(id) on delete set null,
  add column if not exists replaced_at timestamptz;

-- Folder/tag filtering (media-library.tsx / media-picker.tsx) at this
-- project's current scale (see docs/DECISIONS.md — no maintained usage-
-- tracking table, ruling #3) doesn't strictly need an index yet, but
-- both are cheap and match the existing `media_assets_source_idx`
-- convention (0007) for the columns the browse UI filters by.
create index if not exists media_assets_folder_idx on media_assets (folder);
create index if not exists media_assets_tags_idx on media_assets using gin (tags);
