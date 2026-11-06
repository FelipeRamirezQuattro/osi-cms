-- 0065: HSE draft — the two large certification images are cropped, not re-uploaded (QA Entregable 7, design).
-- Both images (ISO 45001 / SGS and ISO 9001 / SCB) are white squares that rendered ~770px tall. They now use the
-- image block's own settings: aspectRatio "4:3" (trims only the white margin top and bottom, the badge stays whole),
-- alignment "left" (36rem wide, in line with the text above and below). Same files, same alt text.
-- Draft only: page_publications / pages.status are not touched; the live page changes on "Publish changes".
-- Backup: page_blocks_backup_20261105 (shared with 0064; a copy of the page's 8 blocks).
-- Guarded: skipped (NOTICE) if the draft changed after this file was written or was already changed. Re-running is a no-op.
--
-- ROLLBACK:
--   do $rb$
--   declare pid uuid := (select id from public.pages where slug = 'hse' and locale = 'en');
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

do $hse$
declare pid uuid := (select id from public.pages where slug = 'hse' and locale = 'en');
begin
  if pid is null then raise notice 'hse page not found - skipped'; return; end if;
  if exists (select 1 from public.page_blocks_backup_20261105 where page_id = pid) then raise notice 'hse already changed - skipped'; return; end if;
  if not (select count(*) = 8 and coalesce(max(updated_at) = '2026-11-03 19:51:34.596842+00'::timestamptz, false) from public.page_blocks where page_id = pid) then
    raise notice 'hse draft changed since this migration was written - skipped'; return;
  end if;
  insert into public.page_blocks_backup_20261105 select b.*, now() from public.page_blocks b where b.page_id = pid;
  update public.page_blocks
     set data = data || '{"aspectRatio":"4:3","alignment":"left"}'::jsonb, updated_at = now()
   where page_id = pid and type = 'image' and position in (2, 5);
  update public.pages set draft_version = draft_version + 1, updated_at = now() where id = pid;
end
$hse$;
