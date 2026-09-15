-- Task: branding module Phase 1 -- branding database, validation,
-- permissions, and audit (see
-- .superpowers/sdd/2026-09-15-branding-module-and-block-theming/
-- phase-1-brief.md). This migration only adds the data layer for a
-- future admin branding module (logo, palette, typography, per-block
-- defaults) -- the theme compiler and admin UI are later phases and do
-- not exist yet, so nothing in the public site reads these tables today.
--
-- Three tables, mirroring the pages draft/publish/revision shape from
-- 0017_publishing_permissions_atomic.sql (draft -> publish -> revision
-- snapshot), adapted for a site-wide singleton rather than one row per
-- page:
--
--   site_branding              admin-only singleton draft (like
--                               site_settings' boolean-PK singleton,
--                               0007_nav_settings_media.sql)
--   site_branding_publications admin-writes/public-reads singleton
--                               snapshot (like page_publications)
--   site_branding_revisions    admin-only immutable publish history
--                               (like page_revisions)
--
-- `config` is validated end-to-end by lib/branding/schema.ts's
-- `brandingConfigSchema` (a version-aware Zod schema keyed on the
-- `config_version` column mirrored inside the jsonb itself) at the
-- Server Action layer (lib/actions/branding.ts) before any of these
-- atomic functions ever see it -- same division of labor as
-- save_page_draft_atomic (0017): the SQL functions own optimistic
-- concurrency, atomicity, and audit; they do not re-implement Zod-level
-- structural validation in plpgsql.
--
-- `primary_logo_media_id` is denormalized out of `config->'logo'->>
-- 'mediaAssetId'` into a real `uuid references media_assets` column on
-- all three tables specifically so a future "can this media asset be
-- deleted" check (plan's Primary logo rules: "a published or draft
-- primary logo cannot be deleted silently") is a plain indexed query,
-- not a jsonb scan across three tables' history.
--
-- Capability: every read of site_branding/site_branding_revisions and
-- every mutation on all three tables requires the EXISTING
-- `manage_settings` capability (lib/auth/capabilities.ts -- already
-- admin-only, not editor-permitted; `public.has_capability('manage_
-- settings')` already resolves to `public.is_admin()`, added in 0017,
-- no change needed there). This is a deliberate, explicit deviation from
-- CLAUDE.md's generic "staff-only via is_staff()" RLS boilerplate: the
-- Phase 1 brief repeatedly specifies manage_settings (admin-only, a
-- strict subset of is_staff()) as the actual authorization boundary for
-- this module ("Draft/history access and all mutations require
-- manage_settings" / "use the EXISTING manage_settings capability ...
-- for all branding draft/history reads and all mutations"), and an
-- editor session must NOT be able to read a branding draft or its
-- history -- using is_staff() here would silently admit editors and
-- violate that acceptance criterion. site_branding_publications is the
-- one structural, no-draft-state table among the three, so it alone
-- gets the `true` public SELECT policy per CLAUDE.md's RLS pattern.

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

create table site_branding (
  id boolean primary key default true check (id),
  config jsonb not null,
  config_version int not null default 1,
  primary_logo_media_id uuid references media_assets (id),
  draft_version bigint not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

create trigger set_updated_at
before update on site_branding
for each row execute function public.set_updated_at();

alter table site_branding enable row level security;

-- Single "for all" policy (not split into per-command policies): unlike
-- pages/page_blocks (which split editor-can-draft from admin-can-
-- publish), there is exactly one authorized audience for this table --
-- manage_settings is already admin-only, so there's no narrower "staff"
-- tier to additionally admit for SELECT. A second permissive SELECT
-- policy here would trip the same performance-advisor WARN CLAUDE.md's
-- RLS conventions call out.
create policy "admins can manage site branding draft"
  on site_branding for all
  using (public.has_capability('manage_settings'))
  with check (public.has_capability('manage_settings'));

create table site_branding_publications (
  id boolean primary key default true check (id),
  config jsonb not null,
  config_version int not null default 1,
  primary_logo_media_id uuid references media_assets (id),
  published_version bigint not null,
  published_at timestamptz not null default now(),
  published_by uuid references auth.users (id),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
before update on site_branding_publications
for each row execute function public.set_updated_at();

alter table site_branding_publications enable row level security;

-- Public read -- the only table of the three a future public theme
-- compiler is allowed to query. Insert/update/delete policies below are
-- a defense-in-depth backstop only; the real (and only intended) write
-- path is publish_branding_atomic, a security definer function that
-- bypasses RLS via table ownership (same as page_publications'
-- equivalent policies in 0017).
create policy "public can read site branding publication"
  on site_branding_publications for select
  using (true);

create policy "admins can create site branding publication"
  on site_branding_publications for insert
  with check (public.has_capability('manage_settings'));

create policy "admins can update site branding publication"
  on site_branding_publications for update
  using (public.has_capability('manage_settings'))
  with check (public.has_capability('manage_settings'));

create policy "admins can delete site branding publication"
  on site_branding_publications for delete
  using (public.has_capability('manage_settings'));

-- Immutable publish history -- SELECT only, even for admins. Unlike
-- page_revisions (which lets staff insert/update/delete a revision row
-- directly, "staff manage page revisions" for-all policy in
-- 0004_pages.sql), branding revisions are written ONLY by
-- publish_branding_atomic below (security definer, bypasses RLS via
-- table ownership) -- no policy admits a direct insert/update/delete
-- from an ordinary authenticated session, which is what "immutable"
-- actually means here rather than just a naming convention.
create table site_branding_revisions (
  id uuid primary key default gen_random_uuid(),
  config jsonb not null,
  config_version int not null,
  primary_logo_media_id uuid references media_assets (id),
  version bigint not null,
  published_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index site_branding_revisions_created_at_idx on site_branding_revisions (created_at desc);

alter table site_branding_revisions enable row level security;

create policy "admins can view site branding revisions"
  on site_branding_revisions for select
  using (public.has_capability('manage_settings'));

-- ---------------------------------------------------------------------
-- Atomic functions
-- ---------------------------------------------------------------------

create or replace function public.save_branding_draft_atomic(
  p_config jsonb,
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
  logo_id uuid;
  incoming_config_version int;
begin
  if not public.has_capability('manage_settings') then
    raise exception 'Not authorized';
  end if;

  if p_config is null or jsonb_typeof(p_config) <> 'object' then
    raise exception 'Branding configuration must be a JSON object';
  end if;

  incoming_config_version := (p_config->>'configVersion')::int;
  if incoming_config_version is null then
    raise exception 'Branding configuration is missing configVersion';
  end if;

  select draft_version into current_version
  from site_branding where id = true for update;
  if not found then raise exception 'Branding draft row not found'; end if;
  if current_version <> p_expected_version then
    raise exception using errcode = '40001', message = 'Branding was changed by another administrator. Refresh before saving.';
  end if;

  logo_id := nullif(p_config->'logo'->>'mediaAssetId', '')::uuid;

  next_version := current_version + 1;
  update site_branding set
    config = p_config,
    config_version = incoming_config_version,
    primary_logo_media_id = logo_id,
    updated_by = auth.uid(),
    draft_version = next_version
  where id = true;

  perform public.record_audit(
    'update_draft', 'site_branding', null,
    jsonb_build_object('draft_version', next_version, 'config_version', incoming_config_version)
  );
  return next_version;
end;
$$;

create or replace function public.publish_branding_atomic(p_expected_version bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  draft_row site_branding%rowtype;
begin
  if not public.has_capability('manage_settings') then raise exception 'Not authorized'; end if;

  select * into draft_row from site_branding where id = true for update;
  if not found then raise exception 'Branding draft row not found'; end if;
  if draft_row.draft_version <> p_expected_version then
    raise exception using errcode = '40001', message = 'Branding was changed by another administrator. Refresh before publishing.';
  end if;

  insert into site_branding_revisions (config, config_version, primary_logo_media_id, version, published_by)
  values (draft_row.config, draft_row.config_version, draft_row.primary_logo_media_id, draft_row.draft_version, auth.uid());

  insert into site_branding_publications (
    id, config, config_version, primary_logo_media_id, published_version, published_at, published_by
  )
  values (true, draft_row.config, draft_row.config_version, draft_row.primary_logo_media_id, draft_row.draft_version, now(), auth.uid())
  on conflict (id) do update set
    config = excluded.config,
    config_version = excluded.config_version,
    primary_logo_media_id = excluded.primary_logo_media_id,
    published_version = excluded.published_version,
    published_at = excluded.published_at,
    published_by = excluded.published_by;

  perform public.record_audit(
    'publish', 'site_branding', null,
    jsonb_build_object('draft_version', draft_row.draft_version)
  );
end;
$$;

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

  next_version := current_version + 1;
  update site_branding set
    config = revision_row.config,
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

create or replace function public.reset_branding_draft_to_published_atomic(p_expected_version bigint)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  published_row site_branding_publications%rowtype;
  current_version bigint;
  next_version bigint;
begin
  if not public.has_capability('manage_settings') then raise exception 'Not authorized'; end if;

  select * into published_row from site_branding_publications where id = true;
  if not found then raise exception 'No published branding to reset to'; end if;

  select draft_version into current_version from site_branding where id = true for update;
  if not found then raise exception 'Branding draft row not found'; end if;
  if current_version <> p_expected_version then
    raise exception using errcode = '40001', message = 'Branding was changed by another administrator. Refresh before resetting.';
  end if;

  next_version := current_version + 1;
  update site_branding set
    config = published_row.config,
    config_version = published_row.config_version,
    primary_logo_media_id = published_row.primary_logo_media_id,
    updated_by = auth.uid(),
    draft_version = next_version
  where id = true;

  perform public.record_audit(
    'reset_draft_to_published', 'site_branding', null,
    jsonb_build_object('draft_version', next_version)
  );
  return next_version;
end;
$$;

revoke all on function public.save_branding_draft_atomic(jsonb, bigint) from public;
revoke all on function public.publish_branding_atomic(bigint) from public;
revoke all on function public.restore_branding_revision_to_draft_atomic(uuid, bigint) from public;
revoke all on function public.reset_branding_draft_to_published_atomic(bigint) from public;

-- Supabase grants EXECUTE to anon/authenticated as a bootstrap-time
-- default privilege independent of the `revoke all ... from public`
-- above (see 0019_revoke_anon_execute_on_atomic_functions.sql) -- revoke
-- it from anon explicitly so only staff sessions can ever call these
-- (each function's own has_capability() check would still reject an
-- anon/editor caller, but exposing write RPCs to anonymous callers at
-- all is exactly what the security advisor's WARN flags).
revoke execute on function public.save_branding_draft_atomic(jsonb, bigint) from anon;
revoke execute on function public.publish_branding_atomic(bigint) from anon;
revoke execute on function public.restore_branding_revision_to_draft_atomic(uuid, bigint) from anon;
revoke execute on function public.reset_branding_draft_to_published_atomic(bigint) from anon;

grant execute on function public.save_branding_draft_atomic(jsonb, bigint) to authenticated;
grant execute on function public.publish_branding_atomic(bigint) to authenticated;
grant execute on function public.restore_branding_revision_to_draft_atomic(uuid, bigint) to authenticated;
grant execute on function public.reset_branding_draft_to_published_atomic(bigint) to authenticated;

-- ---------------------------------------------------------------------
-- Seed: the exact final OSI configuration (Level 1 fallback), identical
-- in both the draft and published rows so the live site is
-- pixel-identical to today the moment this module ships. Generated from
-- lib/branding/seed.ts's OSI_SEED_BRANDING_CONFIG (see that file's top
-- comment) via scripts/print-branding-seed.ts, not hand-typed, so the
-- TypeScript constant and this jsonb literal cannot silently drift --
-- lib/branding/schema.test.ts separately asserts the TS constant parses
-- against brandingConfigV1Schema.
-- ---------------------------------------------------------------------

insert into site_branding (id, config, config_version, primary_logo_media_id, draft_version)
values (true, $branding_seed${"configVersion":1,"swatches":[{"id":"osi-navy-900","name":"Primary navy","hex":"#001B33","category":"brand","note":"Primary dark surface / ink on light.","isCustom":false},{"id":"osi-navy-700","name":"Navy (secondary)","hex":"#04243D","category":"brand","note":"Secondary dark surface, hero scrims.","isCustom":false},{"id":"osi-navy-600","name":"Navy panel","hex":"#133752","category":"brand","note":"Card/panel surface on navy.","isCustom":false},{"id":"osi-steel-500","name":"Steel accent","hex":"#234E7B","category":"brand","note":"Structural lines, secondary accent, info tone.","isCustom":false},{"id":"osi-slate-400","name":"Slate (meta text)","hex":"#4C6880","category":"brand","note":"Meta/caption text.","isCustom":false},{"id":"osi-slate-300","name":"Slate (muted on light)","hex":"#576979","category":"brand","note":"Muted text on light surfaces.","isCustom":false},{"id":"osi-slate-200","name":"Slate (muted on dark)","hex":"#818F9B","category":"brand","note":"Muted text on dark surfaces.","isCustom":false},{"id":"osi-cream-100","name":"Cream surface","hex":"#F2E9DE","category":"brand","note":"Primary light page surface.","isCustom":false},{"id":"osi-sand-300","name":"Sand accent","hex":"#D0C0A7","category":"brand","note":"Secondary neutral accent.","isCustom":false},{"id":"osi-gold-500","name":"Signal gold (on dark)","hex":"#E2902A","category":"brand","note":"Accent color — accessible on navy only.","isCustom":false},{"id":"osi-gold-400","name":"Signal gold (hover, on dark)","hex":"#F0A93D","category":"brand","note":"Hover state for gold-on-dark.","isCustom":false},{"id":"osi-gold-700","name":"Signal gold (on light)","hex":"#885619","category":"brand","note":"Accent color — accessible on cream only.","isCustom":false},{"id":"osi-white","name":"White","hex":"#FFFFFF","category":"system","note":"Text on dark surfaces.","isCustom":false},{"id":"osi-surface-raised","name":"Raised light surface","hex":"#FFFAF4","category":"system","note":"Technical-plate surface background.","isCustom":false},{"id":"osi-focus-fixed","name":"Focus indicator (fixed)","hex":"#0066FF","category":"system","note":"Universal focus ring — never brand-selectable.","isCustom":false},{"id":"osi-status-error","name":"Status: error","hex":"#B91C1C","category":"system","note":"Matches StatusMessage's error tone.","isCustom":false},{"id":"osi-status-success","name":"Status: success","hex":"#047857","category":"system","note":"Matches StatusMessage's success tone.","isCustom":false},{"id":"osi-status-warning","name":"Status: warning","hex":"#B45309","category":"system","note":"New — no prior warning tone existed; see docs/DECISIONS.md.","isCustom":false}],"roles":{"primary":{"swatchId":"osi-navy-900","opacity":1},"secondary":{"swatchId":"osi-navy-700","opacity":1},"accentOnDark":{"swatchId":"osi-gold-500","opacity":1},"accentOnLight":{"swatchId":"osi-gold-700","opacity":1},"lightSurface":{"swatchId":"osi-cream-100","opacity":1},"darkSurface":{"swatchId":"osi-navy-900","opacity":1},"textOnLight":{"swatchId":"osi-navy-900","opacity":1},"textOnDark":{"swatchId":"osi-white","opacity":1},"mutedTextOnLight":{"swatchId":"osi-slate-300","opacity":1},"mutedTextOnDark":{"swatchId":"osi-slate-200","opacity":1},"borderOnLight":{"swatchId":"osi-navy-900","opacity":0.16},"borderOnDark":{"swatchId":"osi-white","opacity":0.18},"focusIndicator":{"swatchId":"osi-focus-fixed","opacity":1},"error":{"swatchId":"osi-status-error","opacity":1},"success":{"swatchId":"osi-status-success","opacity":1},"warning":{"swatchId":"osi-status-warning","opacity":1},"info":{"swatchId":"osi-steel-500","opacity":1}},"surfacePresets":[{"id":"primary-dark","name":"Primary dark","mode":"solid","backgroundSwatchId":"osi-navy-900","textSwatchId":"osi-white","mutedTextSwatchId":"osi-slate-200","accentSwatchId":"osi-gold-500","borderSwatchId":"osi-slate-200"},{"id":"reading-light","name":"Reading light","mode":"solid","backgroundSwatchId":"osi-cream-100","textSwatchId":"osi-navy-900","mutedTextSwatchId":"osi-slate-300","accentSwatchId":"osi-gold-700","borderSwatchId":"osi-slate-300"},{"id":"technical-plate","name":"Technical plate","mode":"solid","backgroundSwatchId":"osi-surface-raised","textSwatchId":"osi-navy-900","mutedTextSwatchId":"osi-slate-300","accentSwatchId":"osi-gold-700","borderSwatchId":"osi-slate-300"},{"id":"transparent-inherit","name":"Transparent / inherit","mode":"transparent","backgroundSwatchId":null,"textSwatchId":null,"mutedTextSwatchId":null,"accentSwatchId":null,"borderSwatchId":null}],"typography":{"display":"orbitron","heading":"montserrat","body":"poppins","label":"poppins"},"blockDefaults":{"hero_full":{"surfacePresetId":"primary-dark","accentSwatchId":"osi-gold-500","typography":{"display":"orbitron","heading":"montserrat","body":"poppins"}},"hero_page":{"surfacePresetId":"reading-light","accentSwatchId":"osi-gold-700","typography":{"heading":"montserrat","label":"poppins"}},"section_heading":{"surfacePresetId":"reading-light","accentSwatchId":null,"typography":{"heading":"montserrat"}},"feature_tiles":{"surfacePresetId":"reading-light","accentSwatchId":"osi-gold-700","typography":{"heading":"montserrat","body":"poppins"}},"stat_grid":{"surfacePresetId":"primary-dark","accentSwatchId":"osi-gold-500","typography":{"display":"orbitron","label":"poppins"}},"mission_cards":{"surfacePresetId":"reading-light","accentSwatchId":"osi-gold-700","typography":{"heading":"montserrat"}},"split_feature":{"surfacePresetId":"reading-light","accentSwatchId":"osi-gold-500","typography":{"heading":"montserrat","body":"poppins","label":"poppins"}},"link_columns":{"surfacePresetId":"reading-light","accentSwatchId":null,"typography":{"heading":"montserrat"}},"global_map":{"surfacePresetId":"primary-dark","accentSwatchId":"osi-gold-500","typography":{"heading":"montserrat","label":"poppins"}},"news_feed":{"surfacePresetId":"reading-light","accentSwatchId":null,"typography":{"heading":"montserrat","label":"poppins"}},"product_grid":{"surfacePresetId":"reading-light","accentSwatchId":"osi-gold-700","typography":{"label":"poppins"}},"recommendations":{"surfacePresetId":"reading-light","accentSwatchId":null,"typography":{"heading":"montserrat","label":"poppins"}},"product_hero":{"surfacePresetId":"primary-dark","accentSwatchId":"osi-gold-500","typography":{"display":"orbitron","body":"poppins","label":"poppins"}},"stages_carousel":{"surfacePresetId":"technical-plate","accentSwatchId":"osi-gold-700","typography":{"display":"orbitron","heading":"montserrat","body":"poppins","label":"poppins"}},"how_it_works":{"surfacePresetId":"primary-dark","accentSwatchId":null,"typography":{"heading":"montserrat","body":"poppins"}},"benefits_cards":{"surfacePresetId":"primary-dark","accentSwatchId":null,"typography":{"heading":"montserrat","body":"poppins"}},"video_embed":{"surfacePresetId":"reading-light","accentSwatchId":null,"typography":{"heading":"montserrat"}},"contact_form":{"surfacePresetId":"reading-light","accentSwatchId":"osi-gold-500","typography":{"heading":"montserrat","label":"poppins"}},"contact_details":{"surfacePresetId":"reading-light","accentSwatchId":null,"typography":{"heading":"montserrat","label":"poppins"}},"cta_band":{"surfacePresetId":"primary-dark","accentSwatchId":"osi-gold-500","typography":{"heading":"montserrat"}},"rich_text":{"surfacePresetId":"reading-light","accentSwatchId":"osi-gold-700","typography":{"heading":"montserrat","body":"poppins"}},"accordion":{"surfacePresetId":"reading-light","accentSwatchId":null,"typography":{"heading":"montserrat","body":"poppins"}},"logo_strip":{"surfacePresetId":"reading-light","accentSwatchId":null,"typography":{"label":"poppins"}},"team_directory":{"surfacePresetId":"reading-light","accentSwatchId":null,"typography":{"heading":"montserrat","label":"poppins"}},"image_gallery":{"surfacePresetId":"reading-light","accentSwatchId":null,"typography":{"heading":"montserrat"}},"spec_table":{"surfacePresetId":"reading-light","accentSwatchId":null,"typography":{"heading":"montserrat","body":"poppins"}},"image":{"surfacePresetId":"transparent-inherit","accentSwatchId":null,"typography":{}},"embed":{"surfacePresetId":"transparent-inherit","accentSwatchId":null,"typography":{}},"columns":{"surfacePresetId":"reading-light","accentSwatchId":"osi-gold-500","typography":{"heading":"montserrat","body":"poppins"}},"quote_testimonial":{"surfacePresetId":"reading-light","accentSwatchId":"osi-gold-700","typography":{"heading":"montserrat","body":"poppins"}},"button_group":{"surfacePresetId":"reading-light","accentSwatchId":"osi-gold-500","typography":{"label":"poppins"}},"resource_list":{"surfacePresetId":"reading-light","accentSwatchId":"osi-gold-700","typography":{"heading":"montserrat","label":"poppins"}},"shared_section":{"surfacePresetId":"transparent-inherit","accentSwatchId":null,"typography":{}},"form":{"surfacePresetId":"reading-light","accentSwatchId":"osi-gold-500","typography":{"heading":"montserrat","label":"poppins"}}},"logo":{"mediaAssetId":null,"altText":"Odessa Separator Inc.","headerSizePreset":"md"}}$branding_seed$::jsonb, 1, null, 1);

insert into site_branding_publications (id, config, config_version, primary_logo_media_id, published_version)
values (true, $branding_seed${"configVersion":1,"swatches":[{"id":"osi-navy-900","name":"Primary navy","hex":"#001B33","category":"brand","note":"Primary dark surface / ink on light.","isCustom":false},{"id":"osi-navy-700","name":"Navy (secondary)","hex":"#04243D","category":"brand","note":"Secondary dark surface, hero scrims.","isCustom":false},{"id":"osi-navy-600","name":"Navy panel","hex":"#133752","category":"brand","note":"Card/panel surface on navy.","isCustom":false},{"id":"osi-steel-500","name":"Steel accent","hex":"#234E7B","category":"brand","note":"Structural lines, secondary accent, info tone.","isCustom":false},{"id":"osi-slate-400","name":"Slate (meta text)","hex":"#4C6880","category":"brand","note":"Meta/caption text.","isCustom":false},{"id":"osi-slate-300","name":"Slate (muted on light)","hex":"#576979","category":"brand","note":"Muted text on light surfaces.","isCustom":false},{"id":"osi-slate-200","name":"Slate (muted on dark)","hex":"#818F9B","category":"brand","note":"Muted text on dark surfaces.","isCustom":false},{"id":"osi-cream-100","name":"Cream surface","hex":"#F2E9DE","category":"brand","note":"Primary light page surface.","isCustom":false},{"id":"osi-sand-300","name":"Sand accent","hex":"#D0C0A7","category":"brand","note":"Secondary neutral accent.","isCustom":false},{"id":"osi-gold-500","name":"Signal gold (on dark)","hex":"#E2902A","category":"brand","note":"Accent color — accessible on navy only.","isCustom":false},{"id":"osi-gold-400","name":"Signal gold (hover, on dark)","hex":"#F0A93D","category":"brand","note":"Hover state for gold-on-dark.","isCustom":false},{"id":"osi-gold-700","name":"Signal gold (on light)","hex":"#885619","category":"brand","note":"Accent color — accessible on cream only.","isCustom":false},{"id":"osi-white","name":"White","hex":"#FFFFFF","category":"system","note":"Text on dark surfaces.","isCustom":false},{"id":"osi-surface-raised","name":"Raised light surface","hex":"#FFFAF4","category":"system","note":"Technical-plate surface background.","isCustom":false},{"id":"osi-focus-fixed","name":"Focus indicator (fixed)","hex":"#0066FF","category":"system","note":"Universal focus ring — never brand-selectable.","isCustom":false},{"id":"osi-status-error","name":"Status: error","hex":"#B91C1C","category":"system","note":"Matches StatusMessage's error tone.","isCustom":false},{"id":"osi-status-success","name":"Status: success","hex":"#047857","category":"system","note":"Matches StatusMessage's success tone.","isCustom":false},{"id":"osi-status-warning","name":"Status: warning","hex":"#B45309","category":"system","note":"New — no prior warning tone existed; see docs/DECISIONS.md.","isCustom":false}],"roles":{"primary":{"swatchId":"osi-navy-900","opacity":1},"secondary":{"swatchId":"osi-navy-700","opacity":1},"accentOnDark":{"swatchId":"osi-gold-500","opacity":1},"accentOnLight":{"swatchId":"osi-gold-700","opacity":1},"lightSurface":{"swatchId":"osi-cream-100","opacity":1},"darkSurface":{"swatchId":"osi-navy-900","opacity":1},"textOnLight":{"swatchId":"osi-navy-900","opacity":1},"textOnDark":{"swatchId":"osi-white","opacity":1},"mutedTextOnLight":{"swatchId":"osi-slate-300","opacity":1},"mutedTextOnDark":{"swatchId":"osi-slate-200","opacity":1},"borderOnLight":{"swatchId":"osi-navy-900","opacity":0.16},"borderOnDark":{"swatchId":"osi-white","opacity":0.18},"focusIndicator":{"swatchId":"osi-focus-fixed","opacity":1},"error":{"swatchId":"osi-status-error","opacity":1},"success":{"swatchId":"osi-status-success","opacity":1},"warning":{"swatchId":"osi-status-warning","opacity":1},"info":{"swatchId":"osi-steel-500","opacity":1}},"surfacePresets":[{"id":"primary-dark","name":"Primary dark","mode":"solid","backgroundSwatchId":"osi-navy-900","textSwatchId":"osi-white","mutedTextSwatchId":"osi-slate-200","accentSwatchId":"osi-gold-500","borderSwatchId":"osi-slate-200"},{"id":"reading-light","name":"Reading light","mode":"solid","backgroundSwatchId":"osi-cream-100","textSwatchId":"osi-navy-900","mutedTextSwatchId":"osi-slate-300","accentSwatchId":"osi-gold-700","borderSwatchId":"osi-slate-300"},{"id":"technical-plate","name":"Technical plate","mode":"solid","backgroundSwatchId":"osi-surface-raised","textSwatchId":"osi-navy-900","mutedTextSwatchId":"osi-slate-300","accentSwatchId":"osi-gold-700","borderSwatchId":"osi-slate-300"},{"id":"transparent-inherit","name":"Transparent / inherit","mode":"transparent","backgroundSwatchId":null,"textSwatchId":null,"mutedTextSwatchId":null,"accentSwatchId":null,"borderSwatchId":null}],"typography":{"display":"orbitron","heading":"montserrat","body":"poppins","label":"poppins"},"blockDefaults":{"hero_full":{"surfacePresetId":"primary-dark","accentSwatchId":"osi-gold-500","typography":{"display":"orbitron","heading":"montserrat","body":"poppins"}},"hero_page":{"surfacePresetId":"reading-light","accentSwatchId":"osi-gold-700","typography":{"heading":"montserrat","label":"poppins"}},"section_heading":{"surfacePresetId":"reading-light","accentSwatchId":null,"typography":{"heading":"montserrat"}},"feature_tiles":{"surfacePresetId":"reading-light","accentSwatchId":"osi-gold-700","typography":{"heading":"montserrat","body":"poppins"}},"stat_grid":{"surfacePresetId":"primary-dark","accentSwatchId":"osi-gold-500","typography":{"display":"orbitron","label":"poppins"}},"mission_cards":{"surfacePresetId":"reading-light","accentSwatchId":"osi-gold-700","typography":{"heading":"montserrat"}},"split_feature":{"surfacePresetId":"reading-light","accentSwatchId":"osi-gold-500","typography":{"heading":"montserrat","body":"poppins","label":"poppins"}},"link_columns":{"surfacePresetId":"reading-light","accentSwatchId":null,"typography":{"heading":"montserrat"}},"global_map":{"surfacePresetId":"primary-dark","accentSwatchId":"osi-gold-500","typography":{"heading":"montserrat","label":"poppins"}},"news_feed":{"surfacePresetId":"reading-light","accentSwatchId":null,"typography":{"heading":"montserrat","label":"poppins"}},"product_grid":{"surfacePresetId":"reading-light","accentSwatchId":"osi-gold-700","typography":{"label":"poppins"}},"recommendations":{"surfacePresetId":"reading-light","accentSwatchId":null,"typography":{"heading":"montserrat","label":"poppins"}},"product_hero":{"surfacePresetId":"primary-dark","accentSwatchId":"osi-gold-500","typography":{"display":"orbitron","body":"poppins","label":"poppins"}},"stages_carousel":{"surfacePresetId":"technical-plate","accentSwatchId":"osi-gold-700","typography":{"display":"orbitron","heading":"montserrat","body":"poppins","label":"poppins"}},"how_it_works":{"surfacePresetId":"primary-dark","accentSwatchId":null,"typography":{"heading":"montserrat","body":"poppins"}},"benefits_cards":{"surfacePresetId":"primary-dark","accentSwatchId":null,"typography":{"heading":"montserrat","body":"poppins"}},"video_embed":{"surfacePresetId":"reading-light","accentSwatchId":null,"typography":{"heading":"montserrat"}},"contact_form":{"surfacePresetId":"reading-light","accentSwatchId":"osi-gold-500","typography":{"heading":"montserrat","label":"poppins"}},"contact_details":{"surfacePresetId":"reading-light","accentSwatchId":null,"typography":{"heading":"montserrat","label":"poppins"}},"cta_band":{"surfacePresetId":"primary-dark","accentSwatchId":"osi-gold-500","typography":{"heading":"montserrat"}},"rich_text":{"surfacePresetId":"reading-light","accentSwatchId":"osi-gold-700","typography":{"heading":"montserrat","body":"poppins"}},"accordion":{"surfacePresetId":"reading-light","accentSwatchId":null,"typography":{"heading":"montserrat","body":"poppins"}},"logo_strip":{"surfacePresetId":"reading-light","accentSwatchId":null,"typography":{"label":"poppins"}},"team_directory":{"surfacePresetId":"reading-light","accentSwatchId":null,"typography":{"heading":"montserrat","label":"poppins"}},"image_gallery":{"surfacePresetId":"reading-light","accentSwatchId":null,"typography":{"heading":"montserrat"}},"spec_table":{"surfacePresetId":"reading-light","accentSwatchId":null,"typography":{"heading":"montserrat","body":"poppins"}},"image":{"surfacePresetId":"transparent-inherit","accentSwatchId":null,"typography":{}},"embed":{"surfacePresetId":"transparent-inherit","accentSwatchId":null,"typography":{}},"columns":{"surfacePresetId":"reading-light","accentSwatchId":"osi-gold-500","typography":{"heading":"montserrat","body":"poppins"}},"quote_testimonial":{"surfacePresetId":"reading-light","accentSwatchId":"osi-gold-700","typography":{"heading":"montserrat","body":"poppins"}},"button_group":{"surfacePresetId":"reading-light","accentSwatchId":"osi-gold-500","typography":{"label":"poppins"}},"resource_list":{"surfacePresetId":"reading-light","accentSwatchId":"osi-gold-700","typography":{"heading":"montserrat","label":"poppins"}},"shared_section":{"surfacePresetId":"transparent-inherit","accentSwatchId":null,"typography":{}},"form":{"surfacePresetId":"reading-light","accentSwatchId":"osi-gold-500","typography":{"heading":"montserrat","label":"poppins"}}},"logo":{"mediaAssetId":null,"altText":"Odessa Separator Inc.","headerSizePreset":"md"}}$branding_seed$::jsonb, 1, null, 1);
