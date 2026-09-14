-- Task 4: capability-based role model — extend has_capability() (defined
-- in 0017_publishing_permissions_atomic.sql) to the "protected global
-- areas" the plan calls out: nav_items, nav_menus, site_settings.
--
-- Today these three tables' write policies (created by
-- 0011_consolidate_select_policies.sql, which split 0007's original
-- "staff manage X" `for all` policy into one per command) all gate on
-- the same undifferentiated public.is_staff() — any active staff
-- session, editor or admin, can write directly against these tables
-- regardless of what the admin UI shows. Per the Task 4 brief, editors
-- must not be able to touch navigation or site settings at all
-- (manage_navigation / manage_settings are admin-only capabilities —
-- see lib/auth/capabilities.ts), so a direct PostgREST/RPC request from
-- an editor session must be rejected by RLS too, not just hidden from
-- the UI.
--
-- Exact current policy names confirmed via `pg_policies` (Supabase MCP
-- execute_sql, read-only) before writing this migration — do NOT guess
-- names the way 0017 did:
--   nav_items:      "read nav_items" (select, using true — untouched),
--                    "staff insert nav_items", "staff update nav_items",
--                    "staff delete nav_items"
--   nav_menus:       "read nav_menus" (select, using true — untouched),
--                    "staff insert nav_menus", "staff update nav_menus",
--                    "staff delete nav_menus"
--   site_settings:   "read site_settings" (select, using true — untouched),
--                     "staff insert site_settings", "staff update site_settings",
--                     "staff delete site_settings"
--
-- Read (SELECT) policies are untouched — these are structural,
-- no-draft-state tables per CLAUDE.md's RLS convention (using (true)),
-- and out of scope here. Products/taxonomy-entity tables/media_assets
-- are explicitly NOT touched — editors keep write access there per the
-- Task 4 brief's ruling (edit_drafts covers day-to-day content work).

drop policy if exists "staff insert nav_items" on nav_items;
drop policy if exists "staff update nav_items" on nav_items;
drop policy if exists "staff delete nav_items" on nav_items;

create policy "admins insert nav_items"
  on nav_items for insert
  with check (public.has_capability('manage_navigation'));

create policy "admins update nav_items"
  on nav_items for update
  using (public.has_capability('manage_navigation'))
  with check (public.has_capability('manage_navigation'));

create policy "admins delete nav_items"
  on nav_items for delete
  using (public.has_capability('manage_navigation'));

drop policy if exists "staff insert nav_menus" on nav_menus;
drop policy if exists "staff update nav_menus" on nav_menus;
drop policy if exists "staff delete nav_menus" on nav_menus;

create policy "admins insert nav_menus"
  on nav_menus for insert
  with check (public.has_capability('manage_navigation'));

create policy "admins update nav_menus"
  on nav_menus for update
  using (public.has_capability('manage_navigation'))
  with check (public.has_capability('manage_navigation'));

create policy "admins delete nav_menus"
  on nav_menus for delete
  using (public.has_capability('manage_navigation'));

drop policy if exists "staff insert site_settings" on site_settings;
drop policy if exists "staff update site_settings" on site_settings;
drop policy if exists "staff delete site_settings" on site_settings;

create policy "admins insert site_settings"
  on site_settings for insert
  with check (public.has_capability('manage_settings'));

create policy "admins update site_settings"
  on site_settings for update
  using (public.has_capability('manage_settings'))
  with check (public.has_capability('manage_settings'));

create policy "admins delete site_settings"
  on site_settings for delete
  using (public.has_capability('manage_settings'));
