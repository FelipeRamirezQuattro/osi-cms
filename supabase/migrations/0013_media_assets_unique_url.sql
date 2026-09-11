-- Needed for the Phase 4 migration script's idempotent upsert
-- (on_conflict: "url") — re-running the migration must not duplicate
-- media_assets rows for the same legacy image URL.
alter table media_assets add constraint media_assets_url_key unique (url);
