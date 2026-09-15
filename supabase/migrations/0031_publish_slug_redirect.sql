-- Task 15: "warn when a page's slug changes and offer to atomically
-- create a redirect from the old published path to the new one, as part
-- of the same publish action" — extends publish_page_atomic
-- (0017_publishing_permissions_atomic.sql) with two new optional,
-- defaulted trailing parameters rather than a second RPC, so the redirect
-- row is written in the exact same transaction as the publish itself
-- (true atomicity, not "call publish, then separately call insert and
-- hope neither half fails").
--
-- Postgres identifies a function by its full argument signature, so
-- `create or replace function public.publish_page_atomic(uuid, bigint,
-- boolean, integer)` would NOT replace the existing 2-arg overload — it
-- would sit alongside it, and a 2-arg call from lib/data/pages.ts's
-- existing callers (or PostgREST resolving `.rpc()` by name) would then
-- be ambiguous between "2 required args, nothing else" and "2 required +
-- 2 defaulted args". The old signature is dropped first so there is
-- exactly one function definition again.
drop function if exists public.publish_page_atomic(uuid, bigint);

create or replace function public.publish_page_atomic(
  p_page_id uuid,
  p_expected_version bigint,
  p_create_redirect boolean default false,
  p_redirect_status_code integer default 301
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  page_row pages%rowtype;
  page_snapshot jsonb;
  previous_slug text;
  previous_path text;
  new_path text;
begin
  if not public.has_capability('publish') then raise exception 'Not authorized'; end if;

  select * into page_row from pages where id = p_page_id for update;
  if not found then raise exception 'Page not found'; end if;
  if page_row.draft_version <> p_expected_version then
    raise exception using errcode = '40001', message = 'This page was changed by another editor. Refresh before publishing.';
  end if;

  -- The slug this page was published under *before* this call — compared
  -- against page_row.slug (the draft's current slug, already saved by
  -- the time the editor clicks Publish — see lib/actions/pages.ts's
  -- publishPageAction, which always calls saveDraft first) to detect a
  -- slug change. Null on a page's first-ever publish, which is never a
  -- "change" worth a redirect.
  select slug into previous_slug from page_publications where page_id = p_page_id;

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

  if p_create_redirect and previous_slug is not null and previous_slug <> page_row.slug then
    -- Mirrors lib/routes.ts's pageHref(): the home page's slug ('home')
    -- resolves to '/', every other slug to '/<slug>'.
    previous_path := case when previous_slug = 'home' then '/' else '/' || previous_slug end;
    new_path := case when page_row.slug = 'home' then '/' else '/' || page_row.slug end;
    -- `on conflict (from_path) do nothing`: redirects.from_path is
    -- unique (0009_redirect_seed.sql) — if an editor (or a previous
    -- publish) already created a redirect from this exact old path,
    -- silently keep the existing one rather than error the whole publish.
    -- previous_path <> new_path is already guaranteed by previous_slug <>
    -- page_row.slug above, so this can never violate
    -- redirects_no_self_loop_check (0030).
    insert into redirects (from_path, to_path, status_code)
    values (previous_path, new_path, p_redirect_status_code)
    on conflict (from_path) do nothing;
  end if;

  update pages set status = 'published', published_at = now(), updated_by = auth.uid()
  where id = p_page_id;

  perform public.record_audit(
    'publish', 'page', p_page_id,
    jsonb_build_object('draft_version', page_row.draft_version, 'redirect_created', p_create_redirect)
  );
end;
$$;

revoke all on function public.publish_page_atomic(uuid, bigint, boolean, integer) from public;

-- Supabase grants EXECUTE to anon/authenticated as a bootstrap-time default
-- privilege independent of the `revoke all ... from public` above (see 0019).
-- The old 2-arg publish_page_atomic had this revoke applied in 0019; dropping
-- and recreating it under this new 4-arg signature (see the `drop function`
-- above) creates a brand new privilege set that needs the same revoke again —
-- otherwise this migration silently re-opens a gap 0019 already closed.
revoke execute on function public.publish_page_atomic(uuid, bigint, boolean, integer) from anon;

grant execute on function public.publish_page_atomic(uuid, bigint, boolean, integer) to authenticated;
