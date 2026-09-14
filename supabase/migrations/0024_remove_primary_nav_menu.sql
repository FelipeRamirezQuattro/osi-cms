-- Task 7 item #11: the "primary" nav menu is confirmed unused —
-- scripts/seed-navigation.ts only ever seeds "utility" and "mega", and
-- nothing in lib/ or app/ queries or renders a "primary" menu (utility +
-- mega are the established header model; see CLAUDE.md's repo layout
-- notes). A read-only check found a leftover "primary" row in the live
-- nav_menus table with zero nav_items under it:
--
--   select id, key from nav_menus where key = 'primary';
--   -- [{"id":"84a41181-0d4a-4164-93ed-d2b265918c00","key":"primary"}]
--   select count(*) from nav_items where menu_id = '84a41181-0d4a-4164-93ed-d2b265918c00';
--   -- 0
--
-- nav_items.menu_id has `on delete cascade` (0007_nav_settings_media.sql),
-- so deleting the nav_menus row would already take any child nav_items
-- with it — the explicit delete below is just documentation of that,
-- since this row happens to have none to cascade.
--
-- The `key in (...)` check constraint on nav_menus is left as-is: it
-- still permits "primary" as a value going forward. Narrowing it would
-- need a constraint rebuild for no real benefit on this MVP database —
-- the admin UI's menu selector is the only thing that actually offers
-- menu keys to choose from, and that no longer offers "primary"
-- (app/admin/(dashboard)/navigation/page.tsx).

delete from nav_items where menu_id in (select id from nav_menus where key = 'primary');
delete from nav_menus where key = 'primary';
