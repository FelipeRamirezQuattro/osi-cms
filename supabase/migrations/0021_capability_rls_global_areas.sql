-- Task 4: capability-based role model — extend has_capability() (defined
-- in 0017_publishing_permissions_atomic.sql) to every remaining table
-- whose write policies still gate on undifferentiated public.is_staff().
--
-- Part 1 (unchanged from the original version of this migration):
-- nav_items/nav_menus/site_settings's INSERT/UPDATE/DELETE all go
-- admin-only (manage_navigation / manage_settings) — the plan's
-- "protected global areas" that editors must not be able to touch at
-- all, not even via a direct PostgREST/RPC request that bypasses the
-- admin UI's hidden controls.
--
-- Part 2 (added after independent review caught the gap): ruling #2 in
-- the Task 4 brief says "every DELETE across every action (products,
-- entities, pages, media) maps to delete_content (admin-only)" — that
-- applies to *every* content/taxonomy/media table, not just the three
-- above. The first version of this migration's comment wrongly folded
-- "editors keep INSERT/UPDATE" into "editors keep DELETE too" for
-- products/taxonomy-entity/media_assets — DELETE on all of those was
-- still bare is_staff() in production, letting any editor's own browser
-- session issue a direct `DELETE /rest/v1/products?id=eq...` and
-- bypass the capability model, every gated Server Action, and every
-- hidden Delete button entirely. Part 2 fixes that: DELETE-only policy
-- swaps (INSERT/UPDATE stay editor-writable, untouched) on every
-- products/taxonomy-entity table (delete_content), media_assets +
-- the `media` storage bucket's storage.objects delete policy
-- (delete_media — matches the existing distinct capability), and
-- form_submissions (delete_content — no dedicated "delete submissions"
-- capability exists, and no admin UI exposes deleting a submission
-- today, so this is pure defense-in-depth against a direct API call).
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
--   DELETE-only, standard "staff delete <table>" name, qual is_staff():
--     products, product_benefits, product_stages, product_specs,
--     product_industries, product_applications, product_related,
--     product_categories, industries, applications, news_posts,
--     resources, locations, directory_contacts, redirects, services,
--     media_assets
--   form_submissions:  "staff can delete submissions" (delete, is_staff())
--     — irregular name, doesn't follow the "staff delete <table>" pattern
--   storage.objects:   "staff can delete from media bucket" (delete,
--     qual `bucket_id = 'media' AND is_staff()`) — irregular name/qual,
--     scoped to one bucket, not a per-table policy
--
-- Read (SELECT) policies, and every INSERT/UPDATE policy on every table
-- below, are untouched — editors keep create/update access on products
-- and taxonomy-entity tables per the Task 4 brief's ruling (edit_drafts
-- covers day-to-day content work); only DELETE moves to admin-only.

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

-- Part 2: DELETE-only lockdown on products/taxonomy-entity tables +
-- media_assets. Every one of these tables' current DELETE policy is
-- named "staff delete <table>" with qual is_staff() — confirmed live,
-- not guessed. INSERT/UPDATE policies on these tables are untouched.
do $$
declare
  t text;
begin
  foreach t in array array[
    'products', 'product_benefits', 'product_stages', 'product_specs',
    'product_industries', 'product_applications', 'product_related',
    'product_categories', 'industries', 'applications', 'news_posts',
    'resources', 'locations', 'directory_contacts', 'redirects', 'services'
  ]
  loop
    execute format('drop policy if exists %I on %I', 'staff delete ' || t, t);
    execute format(
      'create policy %I on %I for delete using (public.has_capability(''delete_content''))',
      'admins delete ' || t, t
    );
  end loop;
end $$;

-- media_assets uses the distinct delete_media capability (matches
-- lib/auth/capabilities.ts, and the storage.objects policy below).
drop policy if exists "staff delete media_assets" on media_assets;
create policy "admins delete media_assets"
  on media_assets for delete
  using (public.has_capability('delete_media'));

-- form_submissions: irregular policy name, no dedicated capability and
-- no admin UI action for it today — delete_content is the general
-- "destructive deletion" capability, used here as defense-in-depth
-- against a direct API call rather than because any Server Action
-- exercises it yet.
drop policy if exists "staff can delete submissions" on form_submissions;
create policy "admins delete form_submissions"
  on form_submissions for delete
  using (public.has_capability('delete_content'));

-- The `media` storage bucket's own object-level DELETE policy (storage
-- glue — the one exception to "no Supabase-proprietary DDL" per
-- CLAUDE.md constraint 2) — irregular name and qual (bucket-scoped, not
-- table-scoped), confirmed live via pg_policies against schemaname =
-- 'storage'. INSERT ("staff can upload to media bucket") and UPDATE
-- ("staff can update media bucket") are untouched — editors keep
-- upload_media.
drop policy if exists "staff can delete from media bucket" on storage.objects;
create policy "staff can delete from media bucket"
  on storage.objects for delete
  using (bucket_id = 'media' and public.has_capability('delete_media'));
