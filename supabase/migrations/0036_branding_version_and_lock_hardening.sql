-- Root-cause fix: publish_branding_atomic never bumped draft_version, so the
-- uniqueness of site_branding_revisions.version (0035's unique index) was
-- only guaranteed by the admin editor always saving before publishing —
-- a UI-layer invariant, not a database one. Bump draft_version here so the
-- invariant holds for any caller, not just today's one click-handler.
--
-- replace_branding_logo_asset_atomic also gets the same for-update lock and
-- draft_version bump every other branding-mutating function already has, so
-- an admin with the editor open doesn't hold a stale version after a logo
-- swap happens underneath them (their next Save would otherwise pass
-- optimistic concurrency and write the old, possibly now-dangling, asset id
-- back). It also gains a manage_settings check alongside its existing
-- delete_media check, for defense in depth — today both resolve to
-- is_admin() so this changes no live behavior, only guards against future
-- capability-model drift.

create or replace function public.publish_branding_atomic(p_expected_version bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  draft_row site_branding%rowtype;
  next_version bigint;
begin
  if not public.has_capability('manage_settings') then raise exception 'Not authorized'; end if;

  select * into draft_row from site_branding where id = true for update;
  if not found then raise exception 'Branding draft row not found'; end if;
  if draft_row.draft_version <> p_expected_version then
    raise exception using errcode = '40001', message = 'Branding was changed by another administrator. Refresh before publishing.';
  end if;

  next_version := draft_row.draft_version + 1;

  insert into site_branding_revisions (config, config_version, primary_logo_media_id, version, published_by)
  values (draft_row.config, draft_row.config_version, draft_row.primary_logo_media_id, next_version, auth.uid());

  insert into site_branding_publications (
    id, config, config_version, primary_logo_media_id, published_version, published_at, published_by
  )
  values (true, draft_row.config, draft_row.config_version, draft_row.primary_logo_media_id, next_version, now(), auth.uid())
  on conflict (id) do update set
    config = excluded.config,
    config_version = excluded.config_version,
    primary_logo_media_id = excluded.primary_logo_media_id,
    published_version = excluded.published_version,
    published_at = excluded.published_at,
    published_by = excluded.published_by;

  update site_branding set draft_version = next_version where id = true;

  perform public.record_audit(
    'publish', 'site_branding', null,
    jsonb_build_object('draft_version', next_version)
  );
end;
$$;

create or replace function public.replace_branding_logo_asset_atomic(
  p_old_asset_id uuid,
  p_new_asset_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  changed integer := 0;
  affected_count integer := 0;
  current_draft_version bigint;
begin
  if not public.has_capability('delete_media') or not public.has_capability('manage_settings') then
    raise exception 'Not authorized';
  end if;
  if p_old_asset_id = p_new_asset_id then raise exception 'Choose a different replacement asset'; end if;
  if not exists (select 1 from media_assets where id = p_new_asset_id) then raise exception 'Replacement asset not found'; end if;

  select draft_version into current_draft_version from site_branding where id = true for update;
  if not found then raise exception 'Branding draft row not found'; end if;

  update site_branding
  set config = jsonb_set(config, '{logo,mediaAssetId}', to_jsonb(p_new_asset_id::text), true),
      primary_logo_media_id = p_new_asset_id,
      draft_version = current_draft_version + 1
  where primary_logo_media_id = p_old_asset_id;
  get diagnostics affected_count = row_count;
  changed := changed + affected_count;

  update site_branding_publications
  set config = jsonb_set(config, '{logo,mediaAssetId}', to_jsonb(p_new_asset_id::text), true),
      primary_logo_media_id = p_new_asset_id
  where primary_logo_media_id = p_old_asset_id;
  get diagnostics affected_count = row_count;
  changed := changed + affected_count;

  perform public.record_audit('replace_logo', 'site_branding', null,
    jsonb_build_object('old_asset_id', p_old_asset_id, 'new_asset_id', p_new_asset_id, 'updated', changed));
  return changed;
end;
$$;
