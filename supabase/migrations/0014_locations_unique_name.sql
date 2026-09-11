-- Needed for the directory migration script's idempotent upsert
-- (on_conflict: "name").
alter table locations add constraint locations_name_key unique (name);
