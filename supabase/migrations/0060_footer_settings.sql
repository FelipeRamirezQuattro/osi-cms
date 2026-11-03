-- 0060: footer settings (QA entregables 5/6, P4). Certification badges and utility links become editable site settings;
-- the four social URLs (columns that already existed, all NULL in production) are filled from the Wix footer.
--
-- What it does
--   * adds site_settings.footer_badges  jsonb [{ imageUrl, alt, href? }]   (certification badges, in order)
--   * adds site_settings.footer_utility_links jsonb [{ label, href }]       (small links under the footer columns)
--   * fills the social URLs that are still NULL, and the two utility links and two badges only while the lists are empty,
--     so anything OSI has already typed in /admin/settings is left alone;
--   * the badge images are NOT created here: run `pnpm import:footer-assets` first (the badge step is skipped with a NOTICE
--     if they are missing, and the migration can simply be re-run after).
-- What it does NOT do
--   * no Web Mail and no Login link (OSI decision); nothing outside site_settings changes; empty settings render nothing.
--
-- ROLLBACK
--   update public.site_settings set social_facebook = null, social_linkedin = null, social_youtube = null, social_instagram = null;
--   alter table public.site_settings drop column footer_badges, drop column footer_utility_links;

alter table public.site_settings add column if not exists footer_badges jsonb not null default '[]'::jsonb;
alter table public.site_settings add column if not exists footer_utility_links jsonb not null default '[]'::jsonb;

do $settings$
declare
  base text := 'https://ovuhuridnalxnzwggzru.supabase.co/storage/v1/object/public/media/legacy-footer/';
  have_badges boolean;
begin
  update public.site_settings set
    social_facebook  = coalesce(social_facebook,  'https://www.facebook.com/OSISolutions'),
    social_linkedin  = coalesce(social_linkedin,  'https://www.linkedin.com/company/odessa-separator-inc/'),
    social_youtube   = coalesce(social_youtube,   'https://www.youtube.com/@odessaseparatorinc-osi3799'),
    social_instagram = coalesce(social_instagram, 'https://www.instagram.com/odessaseparator/');

  update public.site_settings set footer_utility_links = jsonb_build_array(
    jsonb_build_object('label', 'SG-SST Policies', 'href', '/hse/sg-sst-policies'),
    jsonb_build_object('label', 'E-learning', 'href', 'https://learning.odessaseparator.com/login/index.php?loginredirect=1')
  ) where footer_utility_links = '[]'::jsonb;

  select count(*) = 2 into have_badges from public.media_assets where url in (base || 'iso-9001-scb.jpg', base || 'iso-45001-sgs.jpg');
  if not have_badges then
    raise notice 'footer badges skipped: run "pnpm import:footer-assets" first, then re-run this file';
  else
    update public.site_settings set footer_badges = jsonb_build_array(
      jsonb_build_object('imageUrl', base || 'iso-9001-scb.jpg', 'alt', 'ISO 9001 quality management certification, certified by SCB'),
      jsonb_build_object('imageUrl', base || 'iso-45001-sgs.jpg', 'alt', 'ISO 45001 occupational health and safety certification by SGS', 'href', 'https://www.sgs.com/es-co')
    ) where footer_badges = '[]'::jsonb;
  end if;
end
$settings$;
