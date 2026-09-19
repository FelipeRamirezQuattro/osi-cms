-- Blog support on news_posts (Phase 8, sub-project 1).
--
-- Blog posts are a new `kind` of news_posts rather than a separate table:
-- same status/RLS pattern, same admin entity, same body/cover/excerpt
-- columns. The original kind check was created inline in 0005, so Postgres
-- auto-named it `news_posts_kind_check` (same convention 0029 relied on for
-- the status checks).
--
-- New columns are all nullable/defaulted so existing rows are untouched and
-- no RLS change is needed — the table's existing policies already gate on
-- `status` and `is_staff()`.

alter table news_posts drop constraint news_posts_kind_check;
alter table news_posts add constraint news_posts_kind_check
  check (kind in ('news', 'conference', 'event', 'blog'));

alter table news_posts
  add column author_name text,
  add column tags text[] not null default '{}',
  add column reading_minutes integer check (reading_minutes is null or reading_minutes > 0);

-- Tag filtering on /blog uses `tags @> array[...]`.
create index news_posts_tags_idx on news_posts using gin (tags);
