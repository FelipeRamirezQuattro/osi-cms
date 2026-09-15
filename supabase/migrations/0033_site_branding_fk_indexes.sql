-- get_advisors (performance) flagged all 6 foreign keys added by
-- 0032_site_branding.sql as unindexed, same class of finding
-- 0012_missing_fk_indexes.sql / 0028_missing_fk_indexes_round_2.sql
-- already fixed reactively for earlier tables -- following the same
-- convention here rather than folding into 0032 (which is already
-- applied).

create index site_branding_primary_logo_media_id_idx on site_branding (primary_logo_media_id);
create index site_branding_updated_by_idx on site_branding (updated_by);

create index site_branding_publications_primary_logo_media_id_idx on site_branding_publications (primary_logo_media_id);
create index site_branding_publications_published_by_idx on site_branding_publications (published_by);

create index site_branding_revisions_primary_logo_media_id_idx on site_branding_revisions (primary_logo_media_id);
create index site_branding_revisions_published_by_idx on site_branding_revisions (published_by);
