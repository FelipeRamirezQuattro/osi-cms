-- A real draft/publication boundary for CMS pages, capability-aware
-- database enforcement, atomic compound writes, and mutation auditing.

alter table pages add column if not exists draft_version bigint not null default 1;

create table if not exists page_publications (
  page_id uuid primary key references pages (id) on delete cascade,
  slug text not null,
  locale text not null default 'en',
  snapshot jsonb not null,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slug, locale)
);

create trigger set_updated_at
before update on page_publications
for each row execute function public.set_updated_at();

alter table page_publications enable row level security;

create policy "public can read page publications"
  on page_publications for select
  using (true);

-- insert/update/delete only, as three separate policies — Postgres's
-- `FOR` clause takes exactly one command, not a list — rather than one
-- `for all`. "public can read page publications" above (using (true))
-- already covers every SELECT an admin would need, and a second
-- permissive SELECT policy on the same table is exactly what CLAUDE.md's
-- RLS convention forbids (Supabase's performance advisor flags "multiple
-- permissive policies").
create policy "admins can create page publications"
  on page_publications for insert
  with check (public.is_admin());

create policy "admins can update page publications"
  on page_publications for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins can delete page publications"
  on page_publications for delete
  using (public.is_admin());

-- lib/data/search.ts and lib/data/sitemap.ts queried `pages` directly
-- (status = 'published') for anonymous requests; the RLS rewrite below
-- removes all public SELECT access to `pages`, which would silently
-- zero out both features. page_publications is the public-safe stand-in,
-- so it needs its own search_vector mirroring migration 0016's pattern
-- for `pages` (title weighted 'A', seo_description weighted 'B') —
-- sourced from the jsonb snapshot since there's no plain title column
-- here.
alter table page_publications add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(snapshot->'meta'->>'title', '')), 'A') ||
    setweight(to_tsvector('english', coalesce(snapshot->'meta'->>'seo_description', '')), 'B')
  ) stored;
create index page_publications_search_vector_idx on page_publications using gin (search_vector);

-- Backfill the currently published state before anonymous access to the
-- mutable authoring tables is removed.
insert into page_publications (page_id, slug, locale, snapshot, published_at)
select
  p.id,
  p.slug,
  p.locale,
  jsonb_build_object(
    'meta', to_jsonb(p) - 'search_vector',
    'blocks', coalesce(
      (
        select jsonb_agg(to_jsonb(pb) order by pb.position)
        from page_blocks pb
        where pb.page_id = p.id and pb.is_visible
      ),
      '[]'::jsonb
    )
  ),
  coalesce(p.published_at, p.updated_at, now())
from pages p
where p.status = 'published'
on conflict (page_id) do nothing;

drop policy if exists "public can read published pages" on pages;
drop policy if exists "public can read visible blocks of published pages" on page_blocks;
drop policy if exists "staff manage pages" on pages;
drop policy if exists "staff manage page blocks" on page_blocks;

create policy "staff can view page drafts"
  on pages for select
  using (public.is_staff());

create policy "staff can create page drafts"
  on pages for insert
  with check (public.is_staff() and status = 'draft' and not is_system);

create policy "admins can update page rows"
  on pages for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins can delete non-system pages"
  on pages for delete
  using (public.is_admin() and not is_system);

create policy "staff can view draft blocks"
  on page_blocks for select
  using (public.is_staff());

-- Same reasoning as page_publications above: three single-command
-- policies, not `for all` — "staff can view draft blocks" (using
-- is_staff()) already covers every row an admin can see, since
-- is_admin() is strictly is_staff() + role = 'admin' (0001_helpers_and_
-- admin.sql), so an `is_admin()` SELECT grant here would be a second
-- permissive policy over the same rows.
create policy "admins can create draft blocks"
  on page_blocks for insert
  with check (public.is_admin());

create policy "admins can update draft blocks"
  on page_blocks for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins can delete draft blocks"
  on page_blocks for delete
  using (public.is_admin());

create or replace function public.has_capability(capability text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when capability in ('view_admin', 'edit_drafts', 'preview', 'upload_media', 'view_submissions', 'manage_submissions')
      then public.is_staff()
    when capability in (
      'publish', 'delete_content', 'manage_taxonomy', 'delete_media',
      'manage_navigation', 'manage_settings', 'manage_users', 'view_audit'
    ) then public.is_admin()
    else false
  end;
$$;

create or replace function public.record_audit(
  p_action text,
  p_entity text,
  p_entity_id uuid default null,
  p_diff jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'Not authorized';
  end if;
  insert into audit_log (actor_id, action, entity, entity_id, diff)
  values (auth.uid(), p_action, p_entity, p_entity_id, p_diff);
end;
$$;

create or replace function public.save_page_draft_atomic(
  p_page_id uuid,
  p_meta jsonb,
  p_blocks jsonb,
  p_expected_version bigint
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  current_version bigint;
  next_version bigint;
begin
  if not public.has_capability('edit_drafts') then
    raise exception 'Not authorized';
  end if;

  select draft_version into current_version
  from pages where id = p_page_id for update;
  if not found then raise exception 'Page not found'; end if;
  if current_version <> p_expected_version then
    raise exception using errcode = '40001', message = 'This page was changed by another editor. Refresh before saving.';
  end if;

  next_version := current_version + 1;
  update pages set
    slug = trim(both '/' from p_meta->>'slug'),
    locale = coalesce(nullif(p_meta->>'locale', ''), 'en'),
    title = trim(p_meta->>'title'),
    template = coalesce(nullif(p_meta->>'template', ''), 'standard'),
    seo_title = nullif(trim(p_meta->>'seo_title'), ''),
    seo_description = nullif(trim(p_meta->>'seo_description'), ''),
    og_image_url = nullif(trim(p_meta->>'og_image_url'), ''),
    noindex = coalesce((p_meta->>'noindex')::boolean, false),
    updated_by = auth.uid(),
    draft_version = next_version
  where id = p_page_id;

  delete from page_blocks where page_id = p_page_id;
  insert into page_blocks (page_id, type, position, is_visible, data)
  select
    p_page_id,
    item.value->>'type',
    (item.ordinality - 1)::int,
    coalesce((item.value->>'is_visible')::boolean, true),
    coalesce(item.value->'data', '{}'::jsonb)
  from jsonb_array_elements(coalesce(p_blocks, '[]'::jsonb)) with ordinality as item(value, ordinality);

  perform public.record_audit(
    'update_draft', 'page', p_page_id,
    jsonb_build_object('draft_version', next_version, 'block_count', jsonb_array_length(coalesce(p_blocks, '[]'::jsonb)))
  );
  return next_version;
end;
$$;

create or replace function public.publish_page_atomic(p_page_id uuid, p_expected_version bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  page_row pages%rowtype;
  page_snapshot jsonb;
begin
  if not public.has_capability('publish') then raise exception 'Not authorized'; end if;

  select * into page_row from pages where id = p_page_id for update;
  if not found then raise exception 'Page not found'; end if;
  if page_row.draft_version <> p_expected_version then
    raise exception using errcode = '40001', message = 'This page was changed by another editor. Refresh before publishing.';
  end if;

  page_snapshot := jsonb_build_object(
    'meta', to_jsonb(page_row) - 'search_vector',
    'blocks', coalesce(
      (select jsonb_agg(to_jsonb(pb) order by pb.position) from page_blocks pb where pb.page_id = p_page_id and pb.is_visible),
      '[]'::jsonb
    )
  );

  insert into page_revisions (page_id, snapshot, created_by)
  values (p_page_id, page_snapshot, auth.uid());

  insert into page_publications (page_id, slug, locale, snapshot, published_at)
  values (p_page_id, page_row.slug, page_row.locale, page_snapshot, now())
  on conflict (page_id) do update set
    slug = excluded.slug,
    locale = excluded.locale,
    snapshot = excluded.snapshot,
    published_at = excluded.published_at;

  update pages set status = 'published', published_at = now(), updated_by = auth.uid()
  where id = p_page_id;

  perform public.record_audit('publish', 'page', p_page_id, jsonb_build_object('draft_version', page_row.draft_version));
end;
$$;

create or replace function public.unpublish_page_atomic(p_page_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_capability('publish') then raise exception 'Not authorized'; end if;
  delete from page_publications where page_id = p_page_id;
  update pages set status = 'draft', published_at = null, updated_by = auth.uid() where id = p_page_id;
  if not found then raise exception 'Page not found'; end if;
  perform public.record_audit('unpublish', 'page', p_page_id, null);
end;
$$;

create or replace function public.delete_page_atomic(p_page_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare system_page boolean;
begin
  if not public.has_capability('delete_content') then raise exception 'Not authorized'; end if;
  select is_system into system_page from pages where id = p_page_id for update;
  if not found then raise exception 'Page not found'; end if;
  if system_page then raise exception 'System pages cannot be deleted'; end if;
  perform public.record_audit('delete', 'page', p_page_id, null);
  delete from pages where id = p_page_id;
end;
$$;

create or replace function public.duplicate_page_atomic(p_page_id uuid, p_new_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare new_page_id uuid;
begin
  if not public.has_capability('edit_drafts') then raise exception 'Not authorized'; end if;
  insert into pages (
    slug, locale, title, template, seo_title, seo_description,
    og_image_url, noindex, status, is_system, updated_by
  )
  select
    trim(both '/' from p_new_slug), locale, title || ' (Copy)', template,
    seo_title, seo_description, og_image_url, noindex, 'draft', false, auth.uid()
  from pages where id = p_page_id
  returning id into new_page_id;
  if new_page_id is null then raise exception 'Page not found'; end if;

  insert into page_blocks (page_id, type, position, is_visible, data)
  select new_page_id, type, position, is_visible, data
  from page_blocks where page_id = p_page_id order by position;

  perform public.record_audit('duplicate', 'page', new_page_id, jsonb_build_object('source_id', p_page_id));
  return new_page_id;
end;
$$;

revoke all on function public.save_page_draft_atomic(uuid, jsonb, jsonb, bigint) from public;
revoke all on function public.publish_page_atomic(uuid, bigint) from public;
revoke all on function public.unpublish_page_atomic(uuid) from public;
revoke all on function public.delete_page_atomic(uuid) from public;
revoke all on function public.duplicate_page_atomic(uuid, text) from public;
grant execute on function public.save_page_draft_atomic(uuid, jsonb, jsonb, bigint) to authenticated;
grant execute on function public.publish_page_atomic(uuid, bigint) to authenticated;
grant execute on function public.unpublish_page_atomic(uuid) to authenticated;
grant execute on function public.delete_page_atomic(uuid) to authenticated;
grant execute on function public.duplicate_page_atomic(uuid, text) to authenticated;
