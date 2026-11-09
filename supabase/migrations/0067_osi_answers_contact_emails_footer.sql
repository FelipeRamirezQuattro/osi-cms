-- 0067: apply OSI's answers of Nov 9 (QA Entregable 8) — Contact directory, enquiry email, E-learning button.
--
-- BEFORE APPLYING
--   1. replace the single placeholder  <OSI_CONTACT_EMAIL>  below with the address OSI gave us (the script refuses to run while it is still a placeholder);
--   2. pnpm backup:export
--
-- What it does (drafts and settings only; one transaction — it either all applies or nothing does)
--   * creates page_blocks_backup_20261109 and site_settings_backup_20261109 and copies the current rows into them BEFORE touching anything
--     (page_blocks: only the 4 pages below, once per page);
--   * /contact draft, "US Sales" block: removes A.B. Rodriguez, adds Ishani Chakrabarty right after Luke Bell. Every other card is untouched;
--   * replaces the enquiry address with the OSI contact email — visible text AND the mailto: link — in the DRAFT of
--       careers/hiring (svyas@odsep.com), hse/sg-sst-policies (ctrujillo@odsep.com), terms-and-conditions (ggonzalez@odsep.com).
--     The Spanish sentence on SG-SST is kept as is. The Contact directory cards are NOT touched (they are the people's own contacts);
--   * bumps pages.draft_version on each page it changed, so an editor open on a stale copy gets the "changed elsewhere" warning;
--   * site_settings: adds footer_elearning_label / footer_elearning_url and seeds "E-learning" -> the Moodle login (first run only, so a
--     later edit in /admin/settings is never overwritten), and removes the old plain "E-learning" text link from footer_utility_links
--     so the destination is not repeated. The SG-SST Policies link stays.
-- What it does NOT do
--   * never touches page_publications / page_revisions (the live snapshots), pages.status, SEO fields or any other page;
--   * does not change the SGS badge link: the live Wix footer links it to exactly https://www.sgs.com/es-co (checked 2026-11-09), which is
--     what site_settings already holds; the ISO 9001 badge has no link on Wix either. The four social URLs also match Wix. No change.
--   * does not change CONTACT_NOTIFICATION_EMAIL or any env var.
-- Idempotent: a second run finds nothing left to change (backups are kept, not overwritten).
--
-- ROLLBACK
--   pages (one at a time; replace the slug) — restores the draft exactly as it was:
--     do $rb$
--     declare pid uuid := (select id from public.pages where slug = 'SLUG' and locale = 'en');
--     begin
--       delete from public.page_blocks where page_id = pid;
--       insert into public.page_blocks select id, page_id, type, position, is_visible, data, created_at, updated_at
--         from public.page_blocks_backup_20261109 where page_id = pid;
--       delete from public.page_blocks_backup_20261109 where page_id = pid;   -- lets the migration be re-applied later
--       update public.pages set draft_version = draft_version + 1, updated_at = now() where id = pid;
--     end $rb$;
--   settings:
--     update public.site_settings s set footer_utility_links = b.footer_utility_links from public.site_settings_backup_20261109 b where s.id = b.id;
--     alter table public.site_settings drop column footer_elearning_label, drop column footer_elearning_url;   -- and revert the code that reads them
--
-- WHAT QA MUST REPUBLISH AFTERWARDS (the live site only changes when a page is published from the admin): see the notes with this migration —
--   Hiring, SG-SST Policies, Terms and Conditions, and Contact. The footer button is live as soon as this is applied (no republish).

do $osi$
declare
  contact_email constant text := '<OSI_CONTACT_EMAIL>';
  email_pattern constant text := '^[^\s"''\\<>@]+@[^\s"''\\<>@]+\.[^\s"''\\<>@]+$';
  ishani constant jsonb := jsonb_build_object(
    'name', 'Ishani Chakrabarty',
    'title', 'Sales/Application Engineer',
    'emails', jsonb_build_array('ichakrabarty@odsep.com'),
    'phones', jsonb_build_array(
      jsonb_build_object('label', 'Cell', 'number', '+1 (432) 664-0228'),
      jsonb_build_object('label', 'Office', 'number', '+1-432-580-7111')));
  elearning_url constant text := 'https://learning.odessaseparator.com/login/index.php';
  contact_pid uuid;
  page_row record;
  swap record;
  blk record;
  cards jsonb;
  luke_idx bigint;
  n bigint;
  touched uuid[] := '{}';
begin
  -- 0. guard
  if contact_email !~ email_pattern then
    raise exception 'Replace <OSI_CONTACT_EMAIL> at the top of this migration with the real address before applying (got: %)', contact_email;
  end if;

  -- 1. backups (before any change)
  create table if not exists public.page_blocks_backup_20261109 (like public.page_blocks including defaults, backed_up_at timestamptz not null default now());
  create index if not exists page_blocks_backup_20261109_page_idx on public.page_blocks_backup_20261109 (page_id);
  alter table public.page_blocks_backup_20261109 enable row level security;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'page_blocks_backup_20261109') then
    create policy "staff read page_blocks_backup_20261109" on public.page_blocks_backup_20261109 for select using (public.is_staff());
  end if;
  insert into public.page_blocks_backup_20261109 (id, page_id, type, position, is_visible, data, created_at, updated_at)
    select b.id, b.page_id, b.type, b.position, b.is_visible, b.data, b.created_at, b.updated_at
    from public.page_blocks b join public.pages p on p.id = b.page_id
    where p.locale = 'en' and p.slug in ('contact', 'careers/hiring', 'hse/sg-sst-policies', 'terms-and-conditions')
      and not exists (select 1 from public.page_blocks_backup_20261109 k where k.page_id = b.page_id);

  create table if not exists public.site_settings_backup_20261109 (like public.site_settings including defaults, backed_up_at timestamptz not null default now());
  alter table public.site_settings_backup_20261109 enable row level security;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'site_settings_backup_20261109') then
    create policy "staff read site_settings_backup_20261109" on public.site_settings_backup_20261109 for select using (public.is_staff());
  end if;
  -- explicit columns: on a re-run site_settings already has the two new columns, which the backup (a copy of the OLD shape) does not
  insert into public.site_settings_backup_20261109
      (id, phone, email, address_lines, map_embed_url, social_facebook, social_linkedin, social_youtube, social_instagram,
       footer_tagline, footer_badges, footer_utility_links, default_og_image, announcement_bar, created_at, updated_at)
    select s.id, s.phone, s.email, s.address_lines, s.map_embed_url, s.social_facebook, s.social_linkedin, s.social_youtube, s.social_instagram,
       s.footer_tagline, s.footer_badges, s.footer_utility_links, s.default_og_image, s.announcement_bar, s.created_at, s.updated_at
    from public.site_settings s
    where not exists (select 1 from public.site_settings_backup_20261109);

  -- 2. /contact draft: US Sales — remove A.B. Rodriguez, add Ishani Chakrabarty after Luke Bell
  select id into contact_pid from public.pages where slug = 'contact' and locale = 'en';
  for blk in select id, data from public.page_blocks where page_id = contact_pid and type = 'people_cards' and data->>'title' = 'US Sales' loop
    cards := coalesce((
      select jsonb_agg(c order by o)
      from jsonb_array_elements(blk.data->'cards') with ordinality t(c, o)
      where not (c->>'name' = 'A.B. Rodriguez' or c->'emails' ? 'abrodriguez@odsep.com')
    ), '[]'::jsonb);

    if not exists (select 1 from jsonb_array_elements(cards) c where c->'emails' ? 'ichakrabarty@odsep.com') then
      select o into luke_idx from jsonb_array_elements(cards) with ordinality t(c, o) where c->>'name' = 'Luke Bell' limit 1;
      luke_idx := coalesce(luke_idx, jsonb_array_length(cards));
      cards := (
        select coalesce(jsonb_agg(c order by o), '[]'::jsonb)
        from (
          select c, o * 2 as o from jsonb_array_elements(cards) with ordinality t(c, o)
          union all
          select ishani, luke_idx * 2 + 1
        ) x(c, o)
      );
    end if;

    if cards is distinct from blk.data->'cards' then
      update public.page_blocks set data = jsonb_set(data, '{cards}', cards), updated_at = now() where id = blk.id;
      touched := touched || contact_pid;
    end if;
  end loop;

  -- 3. enquiry address -> OSI contact email, in the rich text of three draft pages (text and mailto: link are the same string)
  for swap in
    select * from (values
      ('careers/hiring', 'svyas@odsep.com'),
      ('hse/sg-sst-policies', 'ctrujillo@odsep.com'),
      ('terms-and-conditions', 'ggonzalez@odsep.com')
    ) v(slug, old_address)
  loop
    select id into page_row from public.pages where slug = swap.slug and locale = 'en';
    update public.page_blocks b
      set data = replace(b.data::text, swap.old_address, contact_email)::jsonb, updated_at = now()
      where b.page_id = page_row.id and b.type = 'rich_text' and position(swap.old_address in b.data::text) > 0;
    get diagnostics n = row_count;
    if n > 0 then touched := touched || page_row.id; end if;
  end loop;

  update public.pages set draft_version = draft_version + 1, updated_at = now() where id = any (touched);

  -- 4. footer: E-learning becomes a button (settings), the plain text link goes. First run only.
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'site_settings' and column_name = 'footer_elearning_url') then
    alter table public.site_settings add column footer_elearning_label text, add column footer_elearning_url text;
    update public.site_settings set
      footer_elearning_label = 'E-learning',
      footer_elearning_url = elearning_url,
      footer_utility_links = coalesce((
        select jsonb_agg(l order by o)
        from jsonb_array_elements(footer_utility_links) with ordinality t(l, o)
        where l->>'href' not like 'https://learning.odessaseparator.com/%'
      ), '[]'::jsonb);
  end if;
end
$osi$;
