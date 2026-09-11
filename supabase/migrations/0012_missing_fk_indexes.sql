-- Advisor fix: foreign keys without a covering index.
create index audit_log_actor_id_idx on audit_log (actor_id);
create index page_revisions_created_by_idx on page_revisions (created_by);
create index pages_updated_by_idx on pages (updated_by);
create index product_applications_application_id_idx on product_applications (application_id);
create index product_industries_industry_id_idx on product_industries (industry_id);
create index product_related_related_product_id_idx on product_related (related_product_id);
