-- The "media" bucket (0015_media_storage_bucket.sql) had no bucket-level
-- file_size_limit override, inheriting whatever the project's global
-- Storage limit happens to be. AR model uploads (.glb/.usdz, up to 45MB
-- per lib/validation/media.ts) need an explicit, verifiable ceiling
-- rather than an implicit project default — see docs/DECISIONS.md,
-- Phase 10.
update storage.buckets
set file_size_limit = 52428800 -- 50MB, 5MB above the app-level 45MB cap
where id = 'media';
