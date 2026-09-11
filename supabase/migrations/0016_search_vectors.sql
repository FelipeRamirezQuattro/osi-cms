-- Site-wide search (master prompt §9 Phase 6): Postgres full-text search,
-- no external search service. Generated tsvector columns indexed by a
-- lightweight, plain-text field per table — title/name weighted 'A',
-- a short secondary field weighted 'B'. Deliberately does NOT index the
-- rich `body` jsonb (Tiptap) columns on products/services/news_posts —
-- extracting plain text from arbitrary Tiptap JSON would need a plpgsql
-- function, and title/summary-level matching already covers the search
-- box's likely real use ("do you carry X", "where's the machine shop
-- page"). Revisit if relevance turns out to be too shallow in practice.

alter table pages add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(seo_description, '')), 'B')
  ) stored;
create index pages_search_vector_idx on pages using gin (search_vector);

alter table products add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(tagline, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B')
  ) stored;
create index products_search_vector_idx on products using gin (search_vector);

alter table news_posts add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(excerpt, '')), 'B')
  ) stored;
create index news_posts_search_vector_idx on news_posts using gin (search_vector);

alter table services add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B')
  ) stored;
create index services_search_vector_idx on services using gin (search_vector);
