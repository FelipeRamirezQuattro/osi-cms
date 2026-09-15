-- Task 15: archive/soft-delete for pages, products, news_posts, resources.
--
-- Scope is exactly these 4 tables (the task-15 brief's own list) — NOT
-- industries/applications/locations/directory_contacts, which keep their
-- original draft/published-only check constraint. See docs/DECISIONS.md
-- for the retention policy ("archived content is retained indefinitely
-- until an admin explicitly hard-deletes it" — no automated purge job;
-- this stack has no scheduled-job infrastructure).
--
-- Public reads already filter to `status = 'published'` only (every
-- public repository function in lib/data/*.ts), so an archived row is
-- automatically excluded from public output with zero read-path changes.
--
-- Each constraint below was created inline (`status text not null
-- default 'draft' check (status in ('draft','published'))`) in migrations
-- 0003/0004/0005, so Postgres auto-named it `<table>_status_check` —
-- confirmed against the live schema via a read-only
-- pg_get_constraintdef() query before writing this file.

alter table pages drop constraint pages_status_check;
alter table pages add constraint pages_status_check
  check (status in ('draft', 'published', 'archived'));

alter table products drop constraint products_status_check;
alter table products add constraint products_status_check
  check (status in ('draft', 'published', 'archived'));

alter table news_posts drop constraint news_posts_status_check;
alter table news_posts add constraint news_posts_status_check
  check (status in ('draft', 'published', 'archived'));

alter table resources drop constraint resources_status_check;
alter table resources add constraint resources_status_check
  check (status in ('draft', 'published', 'archived'));

-- `pages` is the one table of the four whose UPDATE policy was locked
-- down to admins only (migration 0017 — "admins can update page rows",
-- using/with check public.is_admin()), with editor-safe state
-- transitions going through SECURITY DEFINER RPCs instead
-- (save_page_draft_atomic/publish_page_atomic/unpublish_page_atomic)
-- that check `has_capability(...)` internally. Archiving/restoring a
-- page needs the same treatment — a plain `update pages set status =
-- 'archived'` from the app's regular (RLS-bound) client would 403 for
-- an editor even though archiving is meant to be edit_drafts-reversible
-- work, same as unpublish.
--
-- products/news_posts/resources don't need an equivalent RPC: their
-- UPDATE policy is still the original "staff manage <table>" `for all
-- using (is_staff())` grant (never locked down the way pages was), so a
-- plain `updateEntityRow(table, id, { status })` call already succeeds
-- for any staff session — see lib/actions/products.ts / lib/actions/
-- entities.ts.
create or replace function public.archive_page_atomic(p_page_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare current_status text;
begin
  select status into current_status from pages where id = p_page_id for update;
  if not found then raise exception 'Page not found'; end if;

  -- Same rule as requirePublishCapabilityForStatusChange (lib/auth/
  -- index.ts): only a transition into/out of 'published' needs the
  -- `publish` capability on top of `edit_drafts`. Archiving a draft is
  -- ordinary edit_drafts work; archiving a *published* page also un-
  -- publishes it (removes its page_publications row), which is exactly
  -- what unpublish_page_atomic already gates behind `publish`.
  if current_status = 'published' then
    if not public.has_capability('publish') then raise exception 'Not authorized'; end if;
    delete from page_publications where page_id = p_page_id;
  else
    if not public.has_capability('edit_drafts') then raise exception 'Not authorized'; end if;
  end if;

  update pages set status = 'archived', published_at = null, updated_by = auth.uid()
  where id = p_page_id;

  perform public.record_audit('archive', 'page', p_page_id, null);
end;
$$;

-- Restoring only ever lands back in 'draft' (never straight back to
-- 'published') — the editor re-publishes explicitly if that's what they
-- want, same reasoning newsSchema/resourceSchema's admin form doesn't
-- let an editor pick 'published' from a draft either without the
-- publish capability (requirePublishCapabilityForStatusChange). Archived
-- -> draft never touches 'published' either direction, so this is plain
-- edit_drafts work.
create or replace function public.restore_page_atomic(p_page_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_capability('edit_drafts') then raise exception 'Not authorized'; end if;
  update pages set status = 'draft', updated_by = auth.uid() where id = p_page_id;
  if not found then raise exception 'Page not found'; end if;
  perform public.record_audit('restore', 'page', p_page_id, null);
end;
$$;

revoke all on function public.archive_page_atomic(uuid) from public;
revoke all on function public.restore_page_atomic(uuid) from public;
grant execute on function public.archive_page_atomic(uuid) to authenticated;
grant execute on function public.restore_page_atomic(uuid) to authenticated;
