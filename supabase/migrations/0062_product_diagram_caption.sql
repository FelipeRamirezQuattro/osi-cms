-- 0062: product diagram caption (QA entregables 5/6, P7). The Gas Release System legend ("Denotes gas that enters the separator
-- downhole ...") was a loose text block in the page body; it is the caption of the hero diagram, so it moves there.
--
-- What it does
--   * adds products.diagram_caption (nullable text; edited in the product form, shown under the hero diagram);
--   * for gas-release-system only: copies its legend block into product_blocks_backup_20261103, deletes that block and
--     stores its text as the caption. Guarded: it only acts if the block is still exactly one paragraph with the known text,
--     and only while the caption is empty, so re-running is a no-op and an edited page is left alone.
-- NOTE: gas-release-system is published, and product pages read the live tables, so this changes the live page when applied
-- (the legend moves from the body into a caption under the diagram).
--
-- ROLLBACK
--   insert into public.product_blocks select id, product_id, type, position, is_visible, data, created_at, updated_at
--     from public.product_blocks_backup_20261103;
--   update public.products set diagram_caption = null where slug = 'gas-release-system';
--   -- (optional, once nothing uses it)  alter table public.products drop column diagram_caption;

alter table public.products add column if not exists diagram_caption text;

create table if not exists public.product_blocks_backup_20261103 (like public.product_blocks including defaults, backed_up_at timestamptz not null default now());
alter table public.product_blocks_backup_20261103 enable row level security;
do $pol$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'product_blocks_backup_20261103') then
    create policy "staff read product_blocks_backup_20261103" on public.product_blocks_backup_20261103 for select using (public.is_staff());
  end if;
end $pol$;

do $mig$
declare
  pid uuid;
  blk record;
  legend constant text := 'Denotes gas that enters the separator downhole in the curve of the well that is then vented out in the casing by the Gas Release System under the Seating Nipple.';
begin
  select id into pid from public.products where slug = 'gas-release-system' and locale = 'en';
  if pid is null then raise exception 'product gas-release-system does not exist'; end if;
  if exists (select 1 from public.products where id = pid and diagram_caption is not null) then raise notice 'skipped: caption already set'; return; end if;

  select * into blk from public.product_blocks
   where product_id = pid and type = 'rich_text'
     and jsonb_array_length(data -> 'content' -> 'content') = 1
     and data #>> '{content,content,0,content,0,text}' = legend
   order by position limit 1;
  if blk.id is null then raise notice 'skipped: the legend block is not there any more (already moved or edited)'; return; end if;

  insert into public.product_blocks_backup_20261103 select b.*, now() from public.product_blocks b where b.id = blk.id;
  delete from public.product_blocks where id = blk.id;
  update public.products set diagram_caption = legend where id = pid;
end
$mig$;
