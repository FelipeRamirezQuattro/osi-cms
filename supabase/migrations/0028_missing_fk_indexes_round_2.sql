-- Advisor fix (get_advisors, post-0026/0027): same class of finding 0012
-- already fixed once — a foreign key with no covering index. Task 10/11
-- each added one such column.
create index form_definitions_updated_by_idx on form_definitions (updated_by);
create index shared_sections_updated_by_idx on shared_sections (updated_by);
create index media_assets_replaced_by_idx on media_assets (replaced_by);
