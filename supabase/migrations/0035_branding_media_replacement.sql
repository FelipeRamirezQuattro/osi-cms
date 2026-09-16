-- Branding-media hardening. Draft/live logo replacement is one transaction;
-- historical revisions retain their JSON snapshot and fall back to the text
-- wordmark after an old asset is removed.

alter table site_branding_revisions drop constraint if exists site_branding_revisions_primary_logo_media_id_fkey;
alter table site_branding_revisions
  add constraint site_branding_revisions_primary_logo_media_id_fkey
  foreign key (primary_logo_media_id) references media_assets(id) on delete set null;

create unique index if not exists site_branding_revisions_version_unique_idx
  on site_branding_revisions (version);

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
begin
  if not public.has_capability('delete_media') then raise exception 'Not authorized'; end if;
  if p_old_asset_id = p_new_asset_id then raise exception 'Choose a different replacement asset'; end if;
  if not exists (select 1 from media_assets where id = p_new_asset_id) then raise exception 'Replacement asset not found'; end if;

  update site_branding
  set config = jsonb_set(config, '{logo,mediaAssetId}', to_jsonb(p_new_asset_id::text), true),
      primary_logo_media_id = p_new_asset_id
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

revoke all on function public.replace_branding_logo_asset_atomic(uuid, uuid) from public;
revoke execute on function public.replace_branding_logo_asset_atomic(uuid, uuid) from anon;
grant execute on function public.replace_branding_logo_asset_atomic(uuid, uuid) to authenticated;

-- A historical revision deliberately keeps its original JSON snapshot when
-- the referenced file is removed. On restore, however, the nullable FK is the
-- authoritative availability signal: clear the stale JSON id so the restored
-- draft is immediately valid and renders the text-wordmark fallback instead
-- of failing its next save on a missing media FK.
create or replace function public.restore_branding_revision_to_draft_atomic(
  p_revision_id uuid,
  p_expected_version bigint
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  revision_row site_branding_revisions%rowtype;
  restored_config jsonb;
  current_version bigint;
  next_version bigint;
begin
  if not public.has_capability('manage_settings') then raise exception 'Not authorized'; end if;

  select * into revision_row from site_branding_revisions where id = p_revision_id;
  if not found then raise exception 'Branding revision not found'; end if;

  select draft_version into current_version from site_branding where id = true for update;
  if not found then raise exception 'Branding draft row not found'; end if;
  if current_version <> p_expected_version then
    raise exception using errcode = '40001', message = 'Branding was changed by another administrator. Refresh before restoring.';
  end if;

  restored_config := revision_row.config;
  if revision_row.primary_logo_media_id is null then
    restored_config := jsonb_set(restored_config, '{logo,mediaAssetId}', 'null'::jsonb, true);
  end if;

  next_version := current_version + 1;
  update site_branding set
    config = restored_config,
    config_version = revision_row.config_version,
    primary_logo_media_id = revision_row.primary_logo_media_id,
    updated_by = auth.uid(),
    draft_version = next_version
  where id = true;

  perform public.record_audit(
    'restore_revision', 'site_branding', p_revision_id,
    jsonb_build_object('draft_version', next_version)
  );
  return next_version;
end;
$$;

revoke all on function public.restore_branding_revision_to_draft_atomic(uuid, bigint) from public;
revoke execute on function public.restore_branding_revision_to_draft_atomic(uuid, bigint) from anon;
grant execute on function public.restore_branding_revision_to_draft_atomic(uuid, bigint) to authenticated;
