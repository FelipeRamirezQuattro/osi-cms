-- publish_page_atomic (0031): when a published page's slug changes AGAIN, keep the
-- `redirects` table flat instead of growing a chain.
--
-- Before: renaming a page a -> b -> c left  a->b  and  b->c  (a two-hop chain that a
-- crawler follows hop by hop). Now, whenever the slug changes (whether or not the
-- editor ticked "create a redirect"):
--   1. a redirect whose *source* is the page's new path is removed — the page lives
--      there now (a published page already wins over a redirect row), and leaving it
--      would loop when a page is renamed back to an earlier slug (a -> b -> a);
--   2. every redirect that pointed at the old path is repointed to the new path
--      (a->b  becomes  a->c), so old links never land on a path that no longer serves;
--   3. if requested, old path -> new path is inserted; an existing row for the old
--      path is updated to the new target (it used to be kept as-is, which would now
--      point at a stale destination).
-- Same signature as 0031, so `create or replace` keeps its grants/revokes (0019).
-- proxy.ts still flattens at runtime as a safety net.

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

  -- The slug this page was published under *before* this call (null on its first-ever publish).
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

  if previous_slug is not null and previous_slug <> page_row.slug then
    -- Mirrors lib/routes.ts's pageHref(): the home page's slug ('home') resolves to '/',
    -- every other slug to '/<slug>'.
    previous_path := case when previous_slug = 'home' then '/' else '/' || previous_slug end;
    new_path := case when page_row.slug = 'home' then '/' else '/' || page_row.slug end;

    delete from redirects where from_path = new_path;

    update redirects set to_path = new_path, updated_at = now()
    where to_path = previous_path;

    if p_create_redirect then
      -- previous_path <> new_path is guaranteed by previous_slug <> page_row.slug, so this can
      -- never violate redirects_no_self_loop_check (0030).
      insert into redirects (from_path, to_path, status_code)
      values (previous_path, new_path, p_redirect_status_code)
      on conflict (from_path) do update
        set to_path = excluded.to_path, status_code = excluded.status_code, updated_at = now();
    end if;
  end if;

  update pages set status = 'published', published_at = now(), updated_by = auth.uid()
  where id = p_page_id;

  perform public.record_audit(
    'publish', 'page', p_page_id,
    jsonb_build_object('draft_version', page_row.draft_version, 'redirect_created', p_create_redirect)
  );
end;
$$;
