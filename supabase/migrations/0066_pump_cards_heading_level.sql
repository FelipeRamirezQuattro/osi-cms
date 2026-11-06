-- 0066: Pump Cards draft — the "OSI's Pump Card Service Features" heading is an h3 right after the page h1, which skips
-- a level (QA Entregable 7 / seo.spec heading-order check). It becomes an h2. Text unchanged.
-- Draft only: page_publications / pages.status are not touched; the live page changes on "Publish changes".
-- Backup: page_blocks_backup_20261105 (shared with 0064/0065). Guarded: skipped (NOTICE) if the draft changed
-- after this file was written or the page was already backed up. Re-running is a no-op.
--
-- ROLLBACK:
--   do $rb$
--   declare pid uuid := (select id from public.pages where slug = 'services/pump-cards' and locale = 'en');
--   begin
--     delete from public.page_blocks where page_id = pid;
--     insert into public.page_blocks select id, page_id, type, position, is_visible, data, created_at, updated_at
--       from public.page_blocks_backup_20261105 where page_id = pid;
--     delete from public.page_blocks_backup_20261105 where page_id = pid;
--     update public.pages set draft_version = draft_version + 1, updated_at = now() where id = pid;
--   end $rb$;

create table if not exists public.page_blocks_backup_20261105 (like public.page_blocks including defaults, backed_up_at timestamptz not null default now());
create index if not exists page_blocks_backup_20261105_page_idx on public.page_blocks_backup_20261105 (page_id);
alter table public.page_blocks_backup_20261105 enable row level security;
do $pol$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'page_blocks_backup_20261105') then
    create policy "staff read page_blocks_backup_20261105" on public.page_blocks_backup_20261105 for select using (public.is_staff());
  end if;
end $pol$;

do $pc$
declare pid uuid := (select id from public.pages where slug = 'services/pump-cards' and locale = 'en');
begin
  if pid is null then raise notice 'pump cards page not found - skipped'; return; end if;
  if exists (select 1 from public.page_blocks_backup_20261105 where page_id = pid) then raise notice 'pump cards already changed - skipped'; return; end if;
  if not (select count(*) = 4 and coalesce(max(updated_at) = '2026-11-03 19:30:17.781316+00'::timestamptz, false) from public.page_blocks where page_id = pid) then
    raise notice 'pump cards draft changed since this migration was written - skipped'; return;
  end if;
  insert into public.page_blocks_backup_20261105 select b.*, now() from public.page_blocks b where b.page_id = pid;
  update public.page_blocks
     set data = replace(data::text, '"level": 3', '"level": 2')::jsonb, updated_at = now()
   where page_id = pid and type = 'rich_text' and position = 3;
  update public.pages set draft_version = draft_version + 1, updated_at = now() where id = pid;
end
$pc$;
