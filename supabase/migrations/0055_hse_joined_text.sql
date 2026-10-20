-- /hse: the legacy scrape joined adjacent text nodes with no separator
-- ("ISO 45001Health & Safety Management", "workplace.Safety", ...). Restores the
-- missing spaces in the editable blocks AND in the published snapshot, which is
-- what the public site actually serves (lib/data/pages.ts reads page_publications).
-- Idempotent: re-running changes nothing. Past page_revisions are left as history.
create or replace function pg_temp.fix_hse_text(t text) returns text
language sql immutable as $$
  select replace(replace(replace(replace(t,
    'ISO 45001Health & Safety Management', 'ISO 45001 Health & Safety Management'),
    'ISO 9001Quality Management', 'ISO 9001 Quality Management'),
    'workplace.Safety and excellence', 'workplace. Safety and excellence'),
    'satisfaction.This achievement', 'satisfaction. This achievement')
$$;

update public.page_blocks b
set data = pg_temp.fix_hse_text(b.data::text)::jsonb
from public.pages p
where p.id = b.page_id and p.slug = 'hse' and b.type = 'rich_text'
  and b.data::text ~ '(ISO 45001Health|ISO 9001Quality|workplace\.Safety|satisfaction\.This)';

update public.page_publications
set snapshot = pg_temp.fix_hse_text(snapshot::text)::jsonb
where slug = 'hse'
  and snapshot::text ~ '(ISO 45001Health|ISO 9001Quality|workplace\.Safety|satisfaction\.This)';
