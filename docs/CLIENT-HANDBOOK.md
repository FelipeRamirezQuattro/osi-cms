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
submissions are waiting, how many pages exist, how many drafts are still
waiting to be published, how many images are missing required alt text,
any broken internal links found on the site, and a list of recently
edited pages plus recent staff activity. The left sidebar (grouped into
Content/Catalog/Directory/Site setup/Admin sections, with the section
you're currently in highlighted) is how you get everywhere else — on a
phone or narrow window it collapses to a menu button in the top bar.

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

- **To add a block**, use the search box at the bottom of the block list
  to find one by name or by what it's for (e.g. typing "gallery" or
  "video" both find relevant blocks), then click its card to add it.
- **To reorder blocks**, drag the ⠿ handle on the left of each block, or
  use the ↑/↓ buttons next to it — the same buttons also work from the
  keyboard (Tab to the ⠿ handle, then Space to pick a block up, arrow
  keys to move it, and Space again to drop it).
- **To edit a block**, click its title to expand it, fill in the fields,
  and they save when you save the page.
- **To temporarily hide a block** without deleting it, click **Hide**.
- **Duplicate** inserts the copy directly below the original block, not
  at the end of the list, so it's easy to find and adjust right away.
- **Remove** does exactly what it says.
- If **Save draft** or **Publish** rejects something (a required field
  left blank, for instance), the editor scrolls to and opens the block
  that needs attention automatically — you don't have to hunt for it.

Along the top: **Save draft** saves your work without changing what
visitors see. Your work also saves itself a few seconds after you stop
typing — a small "Saving…" / "Saved" / "Unsaved changes" note next to
that button shows the current state, so **Save draft** is there for you
to save immediately (before previewing, say) rather than something you
must remember to click. **Publish** makes the current version live — it
also saves a snapshot you can restore later from the **Revisions** panel
on the right, if you ever need to undo a change. **Preview** opens the
page as it will look once published, without actually publishing it —
if you have edits that haven't saved yet, it warns you first, since the
preview can only show what was last saved.

If you try to leave the page (closing the tab, or clicking **← Pages**)
while you have unsaved edits, you'll be asked to confirm first — same as
navigating away with unsaved changes in most other apps. Note that this
warning only covers the browser tab closing/refreshing and this editor's
own back link; it can't catch every possible way of navigating elsewhere
in the admin, so it's still worth glancing at that "Saving…"/"Saved"
indicator before you go.

Changing the **Slug** field changes the page's web address — do this
carefully, since anything linking to the old address will break unless
you also add a redirect (see **Redirects**, below). You don't have to
remember to do that yourself: if you change the slug and click
**Publish**, the editor notices the address is about to change and asks
whether to create that redirect for you, right there, before it
publishes.

A **Publish preflight** panel above the block list lets you click **Check
for issues** any time — it flags things like a link that doesn't point
anywhere real, an image missing alt text, or two blocks sharing the same
jump-to link, so you can see the impact before you publish. None of these
block Publish by themselves (only genuinely broken block content does,
the same "fix this before saving" check you may already have seen) — the
panel is there to tell you what to double-check, not to stop you.

**Archive** (next to Publish/Unpublish) takes a page off the public site
without deleting it — use it for something seasonal or no-longer-relevant
that you might bring back later. An archived page shows up in the
**Pages** list's status filter as `archived`; open it and click
**Restore** to bring it back as a draft. This is different from **Delete
page** in the Danger zone below, which is permanent and only available to
admins.

## Shared sections

**Shared sections** are block sequences you build once and reuse across
several pages — a footer call-to-action, say, that should look and read
the same everywhere it appears. Build one here, then add a **Shared
section** block to any page and give it that section's **key**.

Editing works exactly like editing a page: **Save draft**, then
**Publish** when you're happy with it — and here it matters even more,
because publishing updates *every* page that references it at once.
Nothing changes on the live site until you click Publish, so it's safe
to make changes and preview them first. A shared section's **key** is
set when you create it and can't be changed afterward, since every page
referencing it depends on that key staying put.

## Forms

**Forms** lets you build a new form — a quote request, a newsletter
signup, whatever you need — without asking a developer. Give it a name
and a **form key**, add fields (name, email, phone, a dropdown, a
consent checkbox — pick from the list), write the submit button label
and the message shown after someone submits, and optionally a
**Notification email** to be emailed for each new submission. Set
**Status** to `published`, then add a **Form** block to any page using
that same form key.

Every submission — from any form, including the site's dedicated
Contact form — lands in the same **Submissions** inbox (see below).
The site's main contact form is managed separately, as its own
**Contact form** block; you don't need to rebuild it here.

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
**Status** to `published` when it's ready to go live, save. Every list
screen (including Pages and Products) has a search box, a status filter,
and a sort dropdown across the top — useful once a list grows past a
screenful — and the current search/filter/sort choice is saved in the
page's web address, so you can bookmark or share a filtered view.

**Products** is the most detailed one — besides the basics (name,
images, description), it has Benefits, Stages, and Specs, each an
add/remove list, plus checkboxes for which Industries and Applications
the product applies to, and which other products to show as **Related
products** on that product's page.

Everything defaults to **Status: draft** — draft content never appears
on the public site, so it's safe to prepare something ahead of time and
publish it later.

**Products, News, and Resources** can also be **archived** — a reversible
way to take something off the public site without deleting it (a
discontinued product, an old news post). Each of those list screens has
an **Archive** link per row, an `archived` option in the status filter,
and a **Restore** link once something's archived. Deleting is still
there, still permanent, and still admin-only — archiving is the
in-between option for "not live, but don't throw it away."

**Product categories** (its own sidebar section, separate from
Products) is the short list of category names products are grouped
under — the same name/order pattern as Industries/Applications, but with
no draft/published status of its own (it's a fixed, structural list, not
content that goes live on its own). One thing that's different here: if
you try to delete a category that any product still belongs to, you'll
get a message like "Can't delete — 3 products use this category" instead
of the delete going through. That's intentional, not a bug — a
product's page URL always includes its category, so deleting a category
out from under a product it's still assigned to would break that
product's page. Move or reassign every product out of a category first
(edit each product's Category field), then delete it.

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

**Media** is the full library of every image (and PDF document) on the
site. Search it, filter by folder or tag, upload new files, or delete
ones no longer needed. Uploading a purely decorative image (a background
texture, say) can be marked **Decorative** instead of typing a fake alt
description — everything else still needs real alt text.

You can edit an asset's title, alt text, caption/credit, folder, and tags
at any time from its **Edit** link — no need to re-upload just to fix a
typo or add a tag.

Deleting an asset that's still used somewhere on the site is blocked —
you'll see exactly where it's used (which page, product, or other
record), with a link to each one. To delete it anyway, choose a
replacement image from that same panel; every one of those uses is
swapped to the replacement automatically, and the delete button then
goes through.

## Submissions

**Submissions** is the inbox for every form on the site — the main
Contact form and any form you've built under **Forms**. New ones are
marked **New**; open one to see the full message and mark it **Read** or
**Archive** it. If email notifications have been set up (for the contact
form, or for a specific form under **Forms**), you'll also get an email
for each new submission — but the inbox here is the reliable record
either way. **Export CSV**, at the top, downloads every submission (every
status, every form) as a spreadsheet file — useful for handing a batch of
leads to someone outside the admin, or for your own records outside the
site.

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
might still link to. Two things it won't let you save: a redirect that
points to itself, and one that would chain more than 3 hops deep through
other existing redirects (an old-address-to-old-address-to-old-address
pileup) — either one gets a clear error message explaining why, so you
can fix the chain instead.

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
