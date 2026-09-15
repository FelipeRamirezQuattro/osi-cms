-- Task 10: reusable global sections and a generic, admin-configurable
-- form engine.
--
-- Part 1 — Reusable sections: a stable-key draft table + a publications
-- snapshot table + atomic RPCs, mirroring pages' draft/publish model
-- (0017_publishing_permissions_atomic.sql) as closely as the brief asks
-- ("same shape, same discipline"). Deliberate simplifications vs. pages,
-- called out so they don't read as oversights:
--   - No page_revisions equivalent / no restore action. Pages' revision
--     history exists because a page's blocks are the whole page; a
--     shared section is a small reusable fragment referenced by key, and
--     the acceptance criterion here ("updating a published shared
--     section updates all references only through its explicit Publish
--     action") doesn't require a revision browser. Can be added later
--     the same way if editors ask for it.
--   - `key` is set at creation and never changes via the draft-save RPC
--     (only `title` + `blocks` do) — the key is what every `shared_section`
--     reference block stores, and there's no redirect mechanism for a
--     shared-section reference the way `redirects` covers page slugs, so
--     letting it drift would silently break every page referencing it.
--
-- Part 2 — Generic forms: `form_definitions` (name, form_key, a jsonb
-- `fields` array, submit/success copy, a plain-column notification email)
-- reuses `form_submissions` exactly as it stands (form_key + jsonb
-- payload, already has honeypot/rate-limit/notification plumbing in
-- lib/actions/*) — no schema change needed there. `form_definitions`
-- follows the ordinary content-table pattern (status draft/published,
-- one SELECT policy, staff insert/update, admin delete) rather than a
-- second atomic-publish system — there's no separate "live snapshot"
-- table because, unlike a page, a form has no SEO/preview surface that
-- would leak from an in-place edit; the admin Server Action
-- (lib/actions/forms.ts) still requires the `publish` capability for any
-- draft<->published transition via requirePublishCapabilityForStatusChange,
-- same as products/entities.

-- ---------------------------------------------------------------------
-- Reusable sections
-- ---------------------------------------------------------------------

create table shared_sections (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  draft_version bigint not null default 1,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

create trigger set_updated_at
before update on shared_sections
for each row execute function public.set_updated_at();

create table shared_section_blocks (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references shared_sections (id) on delete cascade,
  type text not null,
  position int not null default 0,
  is_visible boolean not null default true,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index shared_section_blocks_section_id_idx on shared_section_blocks (section_id);

create trigger set_updated_at
before update on shared_section_blocks
for each row execute function public.set_updated_at();

-- Publication snapshot, keyed by the stable `key` (not just section_id)
-- so the public read path (lib/data/shared-sections.ts →
-- getPublishedSharedSectionByKey) is a single indexed lookup — mirrors
-- page_publications' (page_id PK, slug unique) shape.
create table shared_section_publications (
  section_id uuid primary key references shared_sections (id) on delete cascade,
  key text not null unique,
  snapshot jsonb not null,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
before update on shared_section_publications
for each row execute function public.set_updated_at();

alter table shared_sections enable row level security;
alter table shared_section_blocks enable row level security;
alter table shared_section_publications enable row level security;

-- Draft tables: staff can view/create drafts (edit_drafts ~ is_staff());
-- only admins (publish ~ is_admin()) can touch the row directly outside
-- the atomic RPCs below, which run security definer and bypass RLS
-- entirely — same split as pages/page_blocks in 0017, expressed with
-- has_capability() (the capability primitive introduced after 0017, in
-- 0021) instead of the older bare is_admin()/is_staff() calls, since
-- that's the current convention for anything written post-Task-4.
create policy "staff can view shared section drafts"
  on shared_sections for select
  using (public.has_capability('edit_drafts'));

create policy "staff can create shared section drafts"
  on shared_sections for insert
  with check (public.has_capability('edit_drafts') and status = 'draft');

create policy "admins can update shared section rows"
  on shared_sections for update
  using (public.has_capability('publish'))
  with check (public.has_capability('publish'));

create policy "admins can delete shared sections"
  on shared_sections for delete
  using (public.has_capability('delete_content'));

create policy "staff can view shared section draft blocks"
  on shared_section_blocks for select
  using (public.has_capability('edit_drafts'));

create policy "admins can create shared section draft blocks"
  on shared_section_blocks for insert
  with check (public.has_capability('publish'));

create policy "admins can update shared section draft blocks"
  on shared_section_blocks for update
  using (public.has_capability('publish'))
  with check (public.has_capability('publish'));

create policy "admins can delete shared section draft blocks"
  on shared_section_blocks for delete
  using (public.has_capability('publish'));

-- Publications: public read — the shared_section reference block
-- (components/blocks/shared-section.tsx) resolves through this table
-- only, never the draft tables above. Writes are admin-only as a
-- defense-in-depth backstop; the atomic functions below are the real
-- (and only intended) write path.
create policy "public can read shared section publications"
  on shared_section_publications for select
  using (true);

create policy "admins can create shared section publications"
  on shared_section_publications for insert
  with check (public.has_capability('publish'));

create policy "admins can update shared section publications"
  on shared_section_publications for update
  using (public.has_capability('publish'))
  with check (public.has_capability('publish'));

create policy "admins can delete shared section publications"
  on shared_section_publications for delete
  using (public.has_capability('publish'));

create or replace function public.save_shared_section_draft_atomic(
  p_section_id uuid,
  p_title text,
  p_blocks jsonb,
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
begin
  if not public.has_capability('edit_drafts') then
    raise exception 'Not authorized';
  end if;

  select draft_version into current_version
  from shared_sections where id = p_section_id for update;
  if not found then raise exception 'Shared section not found'; end if;
  if current_version <> p_expected_version then
    raise exception using errcode = '40001', message = 'This shared section was changed by another editor. Refresh before saving.';
  end if;

  next_version := current_version + 1;
  update shared_sections set
    title = trim(p_title),
    updated_by = auth.uid(),
    draft_version = next_version
  where id = p_section_id;

  delete from shared_section_blocks where section_id = p_section_id;
  insert into shared_section_blocks (section_id, type, position, is_visible, data)
  select
    p_section_id,
    item.value->>'type',
    (item.ordinality - 1)::int,
    coalesce((item.value->>'is_visible')::boolean, true),
    coalesce(item.value->'data', '{}'::jsonb)
  from jsonb_array_elements(coalesce(p_blocks, '[]'::jsonb)) with ordinality as item(value, ordinality);

  perform public.record_audit(
    'update_draft', 'shared_section', p_section_id,
    jsonb_build_object('draft_version', next_version, 'block_count', jsonb_array_length(coalesce(p_blocks, '[]'::jsonb)))
  );
  return next_version;
end;
$$;

create or replace function public.publish_shared_section_atomic(p_section_id uuid, p_expected_version bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  section_row shared_sections%rowtype;
  section_snapshot jsonb;
begin
  if not public.has_capability('publish') then raise exception 'Not authorized'; end if;

  select * into section_row from shared_sections where id = p_section_id for update;
  if not found then raise exception 'Shared section not found'; end if;
  if section_row.draft_version <> p_expected_version then
    raise exception using errcode = '40001', message = 'This shared section was changed by another editor. Refresh before publishing.';
  end if;

  section_snapshot := jsonb_build_object(
    'title', section_row.title,
    'blocks', coalesce(
      (select jsonb_agg(to_jsonb(b) order by b.position) from shared_section_blocks b where b.section_id = p_section_id and b.is_visible),
      '[]'::jsonb
    )
  );

  insert into shared_section_publications (section_id, key, snapshot, published_at)
  values (p_section_id, section_row.key, section_snapshot, now())
  on conflict (section_id) do update set
    key = excluded.key,
    snapshot = excluded.snapshot,
    published_at = excluded.published_at;

  update shared_sections set status = 'published', published_at = now(), updated_by = auth.uid()
  where id = p_section_id;

  perform public.record_audit('publish', 'shared_section', p_section_id, jsonb_build_object('draft_version', section_row.draft_version));
end;
$$;

create or replace function public.unpublish_shared_section_atomic(p_section_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_capability('publish') then raise exception 'Not authorized'; end if;
  delete from shared_section_publications where section_id = p_section_id;
  update shared_sections set status = 'draft', published_at = null, updated_by = auth.uid() where id = p_section_id;
  if not found then raise exception 'Shared section not found'; end if;
  perform public.record_audit('unpublish', 'shared_section', p_section_id, null);
end;
$$;

create or replace function public.delete_shared_section_atomic(p_section_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  found_id uuid;
begin
  if not public.has_capability('delete_content') then raise exception 'Not authorized'; end if;
  select id into found_id from shared_sections where id = p_section_id for update;
  if not found then raise exception 'Shared section not found'; end if;
  perform public.record_audit('delete', 'shared_section', p_section_id, null);
  delete from shared_sections where id = p_section_id;
end;
$$;

revoke all on function public.save_shared_section_draft_atomic(uuid, text, jsonb, bigint) from public;
revoke all on function public.publish_shared_section_atomic(uuid, bigint) from public;
revoke all on function public.unpublish_shared_section_atomic(uuid) from public;
revoke all on function public.delete_shared_section_atomic(uuid) from public;

-- Supabase grants EXECUTE to anon/authenticated as a bootstrap-time default
-- privilege independent of the `revoke all ... from public` above (see 0019) —
-- revoke it from anon explicitly so only staff sessions can ever call these.
revoke execute on function public.save_shared_section_draft_atomic(uuid, text, jsonb, bigint) from anon;
revoke execute on function public.publish_shared_section_atomic(uuid, bigint) from anon;
revoke execute on function public.unpublish_shared_section_atomic(uuid) from anon;
revoke execute on function public.delete_shared_section_atomic(uuid) from anon;

grant execute on function public.save_shared_section_draft_atomic(uuid, text, jsonb, bigint) to authenticated;
grant execute on function public.publish_shared_section_atomic(uuid, bigint) to authenticated;
grant execute on function public.unpublish_shared_section_atomic(uuid) to authenticated;
grant execute on function public.delete_shared_section_atomic(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Generic forms
-- ---------------------------------------------------------------------

create table form_definitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  form_key text not null unique,
  status text not null default 'draft' check (status in ('draft', 'published')),
  -- Each element: { key, label, type, required, placeholder?, options? }
  -- — type is one of text/email/tel/textarea/select/checkbox-consent/
  -- hidden-page-context (lib/validation/forms.ts's FORM_FIELD_TYPES is
  -- the single source of truth checked at the Zod layer; not re-checked
  -- with a DB constraint since jsonb has no native enum-array check
  -- worth the complexity here).
  fields jsonb not null default '[]'::jsonb,
  submit_label text not null default 'Submit',
  success_message text not null default 'Thanks — we''ll be in touch shortly.',
  -- Plain admin-settable recipient address, not a secret (ruling #5) —
  -- sending itself still goes through lib/email.ts's existing Resend
  -- integration, which no-ops without RESEND_API_KEY/RESEND_FROM_EMAIL.
  notification_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

create trigger set_updated_at
before update on form_definitions
for each row execute function public.set_updated_at();

alter table form_definitions enable row level security;

-- Standard content-table pattern (CLAUDE.md §Schema conventions): one
-- SELECT policy, staff insert/update, admin-only delete. The generic
-- `form` block (components/blocks/form.tsx) reads through this same
-- policy filtered to status = 'published', same as every other public
-- content read.
create policy "public can read published form definitions"
  on form_definitions for select
  using (status = 'published' or public.has_capability('edit_drafts'));

create policy "staff can create form definitions"
  on form_definitions for insert
  with check (public.has_capability('edit_drafts'));

create policy "staff can update form definitions"
  on form_definitions for update
  using (public.has_capability('edit_drafts'))
  with check (public.has_capability('edit_drafts'));

create policy "admins can delete form definitions"
  on form_definitions for delete
  using (public.has_capability('delete_content'));
