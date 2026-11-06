-- 0063 — footer certification badges in full colour (QA Entregable 7).
-- The two badges seeded by 0060 are the grey footer crops from Wix; the HSE page carries the colour originals.
-- Run `pnpm import:footer-assets` first (it adds iso-9001-scb-color.jpg and iso-45001-sgs-color.jpg to the media library).
-- Only touches site_settings.footer_badges, and only while it still holds the 0060 values (so an edit made in
-- Settings in the meantime is never overwritten). The previous value is kept in site_settings_backup_20261105.
--
-- Rollback:
--   update public.site_settings s set footer_badges = b.footer_badges from public.site_settings_backup_20261105 b where s.id = b.id;

do $badges$
declare
  base text := (select regexp_replace(url, '[^/]+$', '') from public.media_assets where url like '%/legacy-footer/iso-9001-scb.jpg' limit 1);
  have_color boolean;
begin
  if base is null then
    raise notice 'footer badges not changed: the 0060 badge images are not in the media library';
    return;
  end if;
  select count(*) = 2 into have_color from public.media_assets where url in (base || 'iso-9001-scb-color.jpg', base || 'iso-45001-sgs-color.jpg');
  if not have_color then
    raise notice 'footer badges not changed: run "pnpm import:footer-assets" first, then re-run this file';
    return;
  end if;

  create table if not exists public.site_settings_backup_20261105 as select * from public.site_settings;
  alter table public.site_settings_backup_20261105 enable row level security;
  if not exists (select 1 from pg_policies where tablename = 'site_settings_backup_20261105') then
    create policy "staff read site_settings_backup_20261105" on public.site_settings_backup_20261105 for select using (public.is_staff());
  end if;

  update public.site_settings set footer_badges = jsonb_build_array(
    jsonb_build_object('imageUrl', base || 'iso-9001-scb-color.jpg', 'alt', 'ISO 9001 quality management certification, certified by SCB'),
    jsonb_build_object('imageUrl', base || 'iso-45001-sgs-color.jpg', 'alt', 'ISO 45001 occupational health and safety certification by SGS', 'href', 'https://www.sgs.com/es-co')
  )
  where footer_badges @> jsonb_build_array(jsonb_build_object('imageUrl', base || 'iso-9001-scb.jpg'))
    and footer_badges @> jsonb_build_array(jsonb_build_object('imageUrl', base || 'iso-45001-sgs.jpg'));
end
$badges$;
