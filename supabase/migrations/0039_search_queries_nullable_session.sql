-- A visitor can land directly on /search (no prior pageview beacon has
-- fired yet, so no osi_sid/osi_vid cookies exist) before ever generating
-- a session. Search-query logging must still work for that first visit —
-- "Top Searches"/"Searches with No Results"/"Searches over Time" don't
-- need a session join (unlike page views/events), so these can simply be
-- null rather than forcing a fabricated session that corresponds to no
-- real page view.
alter table analytics_search_queries
  alter column session_id drop not null,
  alter column visitor_id drop not null;
