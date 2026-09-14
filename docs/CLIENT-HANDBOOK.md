# OSI website — admin handbook

A short guide to running odessaseparator.com day to day. No technical
background needed — if something isn't covered here, ask whoever set up
the site.

## Signing in

Go to `/admin` (e.g. `odessaseparator.com/admin`) and sign in with your
email and password. New staff accounts are set up by an existing admin
(see **Users**, below) — there's no public sign-up.

If you forget your password, use the "forgot password" link on the sign-in
page.

## The dashboard

After signing in you'll land on the dashboard: how many new contact-form
submissions are waiting, how many pages exist, and a list of recently
edited pages. The left sidebar is how you get everywhere else.

## Creating a page

**Pages → New page** asks for a title, a web address (slug), and a
**Starting point** — a quick preset that adds a few blocks to get you
going (a landing page starts with a hero and a call-to-action band, a
legal page starts with one text block, a contact page starts with the
contact form; "standard" starts blank). It's only a starting point — you
can add, remove, or rearrange blocks freely afterward, and changing it
later doesn't do anything.

## Editing a page

**Pages → click a page** opens the editor. A page is built from
**blocks** — a hero banner, a row of stat numbers, a contact form, and so
on, stacked top to bottom.

- **To add a block**, pick a type from the dropdown at the bottom of the
  block list and click **+ Add block**.
- **To reorder blocks**, drag the ⠿ handle on the left of each block.
- **To edit a block**, click its title to expand it, fill in the fields,
  and they save when you save the page.
- **To temporarily hide a block** without deleting it, click **Hide**.
- **Duplicate**/**Remove** do exactly what they say.

Along the top: **Save draft** saves your work without changing what
visitors see. **Publish** makes the current version live — it also saves
a snapshot you can restore later from the **Revisions** panel on the
right, if you ever need to undo a change. **Preview** opens the page as
it will look once published, without actually publishing it.

Changing the **Slug** field changes the page's web address — do this
carefully, since anything linking to the old address will break unless
you also add a redirect (see **Redirects**, below).

## Choosing images

Wherever you see a **Choose image** button, it opens the media library.
You can pick an existing image or upload a new one. **Alt text is
required on upload** — a short, plain description of what the image
shows (e.g. "ESP Gas Release System diagram"). This isn't red tape: it's
what a screen reader reads aloud to a visitor who can't see the image,
and it's required by law in some jurisdictions for a commercial site.

## Writing formatted text

Fields labeled for rich text give you a small toolbar: bold, italic,
headings, bullet/numbered lists, and links. That's it on purpose — it
keeps every page visually consistent with the rest of the site.

## Products, news, industries, applications, resources, locations,
## directory

Each of these has its own section in the sidebar with a list view and an
edit screen, the same pattern as pages: fill in the fields, set
**Status** to `published` when it's ready to go live, save.

**Products** is the most detailed one — besides the basics (name,
images, description), it has Benefits, Stages, and Specs, each an
add/remove list, plus checkboxes for which Industries and Applications
the product applies to, and which other products to show as **Related
products** on that product's page.

Everything defaults to **Status: draft** — draft content never appears
on the public site, so it's safe to prepare something ahead of time and
publish it later.

Note: **Services** (Fluid Levels, Pump Cards, Machine Shop) doesn't have
its own sidebar section — those are regular pages, edited under
**Pages** like any other page.

## Navigation

**Navigation** controls the menus — the header's utility links, the mega
menu (the big dropdown with product columns), the footer columns, and so
on. Switch between menus using the tabs at the top. Add a top-level item,
optionally add children under it, and use the ↑/↓ arrows to reorder.
Check **External link** for anything that points off the OSI site (a
distributor's own website, for example) — it opens in a new tab and
shows a small ↗ mark so visitors know it's leaving the site.

## Media library

**Media** is the full library of every image on the site — search it,
upload new images (alt text required, same as above), or delete ones
that are no longer used. Deleting an image that's still used somewhere
will leave a broken image there, so double-check first.

## Submissions

**Submissions** is the inbox for the contact form. New ones are marked
**New**; open one to see the full message and mark it **Read** or
**Archive** it. If email notifications have been set up, you'll also get
an email for each new submission — but the inbox here is the reliable
record either way.

## Settings

**Settings** holds the site-wide basics: phone number, address, map
embed, social media links, and the default social-sharing image (used
when a page doesn't have its own). It also has the **Announcement bar**
— a banner across the top of every page for something time-sensitive
(a trade show, a holiday closure). Turn it on, write the message, and
optionally add a link. Once a visitor closes it, it stays closed for
them until you change the message — editing the text brings it back for
everyone, even people who dismissed the old wording.

## Redirects

**Redirects** sends visitors from an old web address to a new one — use
this any time you change a page's slug or remove a page that other sites
might still link to.

## Users

**Users** (visible to admins only) is where you invite new staff. Choose
a role: **editor** can create and edit content but not publish it or
manage users; **admin** can do everything. You can also disable an
account here if someone leaves.

## Audit log

**Audit log** (visible to admins only) is a running record of who
changed what — every create, edit, delete, publish, reorder, and setting
change across the site, with who did it and when. Filter by staff
member, the kind of thing that changed (a product, a page, navigation,
and so on), the action taken, or a date range, to answer "who changed
this and when" without having to ask around.

## If something looks wrong

- A page showing old content after you published? Give it a few seconds
  and refresh — changes are usually instant, but occasionally caching
  takes a moment to catch up.
- An error page instead of the site? It's usually temporary — try again
  in a minute. If it keeps happening, contact your developer.
- Something in the admin behaves unexpectedly — try refreshing the page
  first; if it persists, note what you were doing and reach out.
