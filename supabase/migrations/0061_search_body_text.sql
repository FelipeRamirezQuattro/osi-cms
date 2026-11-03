-- 0061: site search covers the visible body text of pages, news and products (QA entregables 5/6, P6).
--
-- Before: only titles and short summaries were indexed. Now:
--   * public.search_visible_text(jsonb)  every string a visitor can read inside a block / rich-text document, in document order.
--     Skipped: URLs and paths, alt text, ids/keys/slugs, layout and style options ("appearance", "background", "spacingTop", ...).
--   * public.search_page_text(snapshot)  the visible text of a PUBLISHED page (blocks with is_visible = false are left out).
--   * page_publications / news_posts get a generated `search_body` (the text, used for snippets) and a rebuilt `search_vector`
--     = title (A) + description/excerpt (B) + body (C). Drafts never appear: page_publications only holds published snapshots and the
--     queries keep their status = 'published' filter.
--   * products: the text lives in several tables (body, benefits, stages, specs, extra blocks), so a plain view
--     `product_search_documents` (security_invoker, so RLS still applies) aggregates it and builds the vector on the fly.
--     Hidden sections (a linked product_* row with is_visible = false) are left out.
-- Plain portable SQL: no extensions, triggers or Supabase-specific objects. The tables are small (tens of rows); the page/news
-- vectors keep their GIN indexes, the view is computed per query.
--
-- ROLLBACK
--   drop view if exists public.product_search_documents;  drop function if exists public.product_search_text(uuid);
--   alter table public.page_publications drop column search_vector, drop column search_body;
--   alter table public.page_publications add column search_vector tsvector generated always as (
--     setweight(to_tsvector('english', coalesce(((snapshot -> 'meta') ->> 'title'), '')), 'A') ||
--     setweight(to_tsvector('english', coalesce(((snapshot -> 'meta') ->> 'seo_description'), '')), 'B')) stored;
--   create index page_publications_search_vector_idx on public.page_publications using gin (search_vector);
--   alter table public.news_posts drop column search_vector, drop column search_body;
--   alter table public.news_posts add column search_vector tsvector generated always as (
--     setweight(to_tsvector('english', coalesce(title, '')), 'A') || setweight(to_tsvector('english', coalesce(excerpt, '')), 'B')) stored;
--   create index news_posts_search_vector_idx on public.news_posts using gin (search_vector);
--   drop function public.search_page_text(jsonb);  drop function public.search_visible_text(jsonb);

create or replace function public.search_visible_text(doc jsonb)
returns text
language sql
immutable
parallel safe
set search_path = public
as $fn$
  with recursive walk(path, k, v) as (
    select array[]::int[], null::text, doc
    union all
    select w.path || c.ord::int, c.k, c.v
    from walk w
    cross join lateral (
      select o.ord, o.key as k, o.value as v
        from jsonb_each(case when jsonb_typeof(w.v) = 'object' then w.v else '{}'::jsonb end) with ordinality as o(key, value, ord)
       where o.key !~ '(Url|Href|Key|Slug|Id|Ids|Src|Alt)$'
         and o.key !~ '^(id|type|appearance|background|alignment|align|layout|variant|kind|provider|mediaType|focalPoint|display|aspectRatio|decorative|displayWidth|level|icon|iconKey|spacingTop|spacingBottom|anchorId|embed|mime|marks)$'
      union all
      select a.ord, w.k, a.value
        from jsonb_array_elements(case when jsonb_typeof(w.v) = 'array' then w.v else '[]'::jsonb end) with ordinality as a(value, ord)
    ) c
  )
  select nullif(string_agg(btrim(v #>> '{}'), ' ' order by path), '')
    from walk
   where jsonb_typeof(v) = 'string'
     and btrim(v #>> '{}') <> ''
     and (v #>> '{}') !~ '^\s*(https?:|/|mailto:|tel:|data:|#)'
$fn$;

create or replace function public.search_page_text(snapshot jsonb)
returns text
language sql
immutable
parallel safe
set search_path = public
as $fn$
  select public.search_visible_text(
    (select jsonb_agg(b -> 'data' order by o) from jsonb_array_elements(snapshot -> 'blocks') with ordinality as t(b, o)
      where coalesce(b ->> 'is_visible', 'true') <> 'false')
  )
$fn$;

-- Published pages
alter table public.page_publications drop column if exists search_vector;
alter table public.page_publications drop column if exists search_body;
alter table public.page_publications add column search_body text generated always as (public.search_page_text(snapshot)) stored;
alter table public.page_publications add column search_vector tsvector generated always as (
  setweight(to_tsvector('english', coalesce(((snapshot -> 'meta') ->> 'title'), '')), 'A') ||
  setweight(to_tsvector('english', coalesce(((snapshot -> 'meta') ->> 'seo_description'), '')), 'B') ||
  setweight(to_tsvector('english', coalesce(public.search_page_text(snapshot), '')), 'C')
) stored;
create index if not exists page_publications_search_vector_idx on public.page_publications using gin (search_vector);

-- News and blog posts (draft/published filtering stays in the query)
alter table public.news_posts drop column if exists search_vector;
alter table public.news_posts drop column if exists search_body;
alter table public.news_posts add column search_body text generated always as (public.search_visible_text(body)) stored;
alter table public.news_posts add column search_vector tsvector generated always as (
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(excerpt, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(public.search_visible_text(body), '')), 'C')
) stored;
create index if not exists news_posts_search_vector_idx on public.news_posts using gin (search_vector);

-- Products: the page is body + benefits + stages + specs + extra blocks; a hidden linked section hides its text too.
create or replace function public.product_search_text(pid uuid)
returns text
language sql
stable
set search_path = public
as $fn$
  select nullif(btrim(concat_ws(' ',
    case when exists (select 1 from product_blocks where product_id = pid and type = 'product_body' and not is_visible) then null
         else public.search_visible_text((select body from products where id = pid)) end,
    case when exists (select 1 from product_blocks where product_id = pid and type = 'product_benefits' and not is_visible) then null
         else (select string_agg(concat_ws(' ', title, body), ' ' order by position) from product_benefits where product_id = pid) end,
    case when exists (select 1 from product_blocks where product_id = pid and type = 'product_stages' and not is_visible) then null
         else (select string_agg(concat_ws(' ', title, body), ' ' order by position) from product_stages where product_id = pid) end,
    case when exists (select 1 from product_blocks where product_id = pid and type = 'product_specs' and not is_visible) then null
         else (select string_agg(concat_ws(' ', label, value, unit), ' ' order by position) from product_specs where product_id = pid) end,
    (select string_agg(
        case when type like 'product\_%' then data ->> 'title' else public.search_visible_text(data) end, ' ' order by position)
       from product_blocks where product_id = pid and is_visible)
  )), '')
$fn$;

create or replace view public.product_search_documents with (security_invoker = true) as
select p.id as product_id, p.slug, p.name, p.tagline, p.summary, p.status, c.slug as category_slug,
       t.body_text,
       setweight(to_tsvector('english', coalesce(p.name, '')), 'A') ||
       setweight(to_tsvector('english', coalesce(p.tagline, '')), 'B') ||
       setweight(to_tsvector('english', coalesce(p.summary, '')), 'B') ||
       setweight(to_tsvector('english', coalesce(t.body_text, '')), 'C') as search_vector
  from public.products p
  left join public.product_categories c on c.id = p.category_id
 cross join lateral (select public.product_search_text(p.id) as body_text) t;

grant select on public.product_search_documents to anon, authenticated;
