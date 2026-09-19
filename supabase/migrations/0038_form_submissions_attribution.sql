-- Links a form submission back to the analytics session/visitor that
-- made it, so "Form Submissions by Traffic Source" (Marketing) and
-- "Contacts by Source" (People) can attribute a lead to how the visitor
-- originally found the site. Nullable, no foreign key: form_submissions
-- is a real business record (a lead) and must never be affected by a
-- future analytics-retention purge of analytics_page_views.
alter table form_submissions
  add column session_id uuid,
  add column visitor_id uuid;
