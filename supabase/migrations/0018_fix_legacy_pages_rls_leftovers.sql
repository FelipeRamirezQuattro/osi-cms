-- Migration 0017 intended to remove every pre-existing pages/page_blocks
-- policy before installing the staff/admin-only model, but its `drop
-- policy if exists` statements guessed the wrong original policy names
-- (the real ones, from 0004_pages.sql, are listed below). Because DROP
-- POLICY IF EXISTS is a silent no-op on a name that doesn't match, 0017
-- applied successfully while leaving the old, broader policies live
-- alongside the new ones — and since RLS policies for the same command
-- are OR'd together, the old policies fully defeated 0017's intent:
--   - "staff insert pages"/"staff update pages"/"staff delete pages"
--     (is_staff(), no draft/system/admin restriction) let any editor
--     write directly to `pages` — bypassing draft-only creation,
--     admin-only publish/delete, and the atomic RPCs' optimistic
--     concurrency and audit logging entirely.
--   - "staff insert/update/delete page_blocks" (is_staff(), unrestricted)
--     had the same effect on block content.
--   - "read pages"/"read page_blocks" were merely redundant with the new
--     SELECT policies (same effective condition), not a privilege gap,
--     but still a "duplicate permissive policy" per this project's RLS
--     convention.
-- This migration removes exactly the leftover policies, confirmed
-- against a live `pg_policies` query, so only 0017's intended policies
-- remain.

drop policy if exists "read pages" on pages;
drop policy if exists "staff insert pages" on pages;
drop policy if exists "staff update pages" on pages;
drop policy if exists "staff delete pages" on pages;

drop policy if exists "read page_blocks" on page_blocks;
drop policy if exists "staff insert page_blocks" on page_blocks;
drop policy if exists "staff update page_blocks" on page_blocks;
drop policy if exists "staff delete page_blocks" on page_blocks;
