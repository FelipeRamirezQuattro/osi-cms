# OSI admin handbook screenshot shot list

All captures use `https://osi-cms.vercel.app`, Chromium, `en-US`,
`America/Chicago`, reduced motion, and a 1440 × 900 viewport at 2× device
scale unless the row says mobile. The script masks the signed-in email on
every authenticated screen and masks private records more broadly on the
dashboard, subscriber, submission, user, and audit-log screens.

| Handbook section and task | Screenshot file | URL | Must show | Gold highlight |
| --- | --- | --- | --- | --- |
| Signing in | `signing-in-01-login.png` | `/admin/login` | Email and password form without entered credentials | Email, password, and Sign in controls as ①②③ |
| The dashboard | `dashboard-01-overview.png` | `/admin` | Summary cards, recently edited pages, and the grouped sidebar | Summary cards and sidebar |
| The dashboard on a phone | `dashboard-02-mobile-menu.png` | `/admin` at 390 × 844 | Open admin navigation drawer | Menu button and open drawer as ①② |
| Creating a page from the list | `creating-a-page-01-pages-list.png` | `/admin/pages` | Page search, status filter, sort control, and New page | New page |
| Creating a page starting point | `creating-a-page-02-new-page.png` | `/admin/pages/new` | Title, slug, and Starting point choices | Title, Slug, and Starting point as ①②③ |
| Editing a page actions | `editing-a-page-01-editor-actions.png` | the `PRUEBA CODEX handbook` draft | Back link, save status, Save draft, Preview, Publish, and Archive area before any action | Save draft, Preview, and Publish as ①②③ |
| Editing a page blocks | `editing-a-page-02-block-controls.png` | the `PRUEBA CODEX handbook` draft | One expanded block with drag handle, move, Hide, Duplicate, and Remove controls | Handle, Hide, Duplicate, and Remove |
| Editing a page add a block | `editing-a-page-03-add-block.png` | the `PRUEBA CODEX handbook` draft | Searchable block palette and matching cards | Search field and selected block card as ①② |
| Editing a page version history | `editing-a-page-04-version-history.png` | an existing published page editor | Revisions panel plus Publish and Unpublish controls, without clicking either | Revisions panel and Unpublish |
| Editing a page on a phone | `editing-a-page-05-mobile-editor.png` | the `PRUEBA CODEX handbook` draft at 390 × 844 | Narrow editor layout and block controls | Save state and block controls |
| Writing formatted text | `writing-formatted-text-01-toolbar.png` | the draft page with a Text block | Rich-text toolbar and editing area | Bold, heading, list, and link controls |
| Choosing images | `choosing-images-01-picker.png` | draft-page image field | Open media picker with existing assets | Choose image trigger and an asset choice as ①② |
| Media library upload | `choosing-images-02-upload.png` | `/admin/media` | Upload controls, file picker, required alt text, Decorative option | File, Alt text, and Upload as ①②③ |
| Adding a 3D AR model | `ar-model-01-fields.png` | draft page with an AR model block | GLB, USDZ, alt text, poster, and caption fields | GLB and USDZ fields as ①② |
| Shared sections list | `shared-sections-01-list.png` | `/admin/shared-sections` | Shared-section list and New shared section | New shared section |
| Shared section editor | `shared-sections-02-editor.png` | an existing shared section, or its New screen if none exists | Key, block list, Save draft, and Publish workflow | Key and save/publish controls |
| Forms list | `forms-01-list.png` | `/admin/forms` | Existing forms, statuses, and New form | New form |
| Form editor | `forms-02-editor.png` | an existing form, or `/admin/forms/new` if none exists | Name, form key, fields, submit label, success message, notification email, and status | Form key, Add field, and Status |
| Products list | `products-01-list.png` | `/admin/products` | Search, status filter, sort, and product rows | Search/filter controls and first Edit link |
| Product editor | `products-02-editor.png` | an existing product editor | Core fields plus Benefits, Stages, Specs, taxonomy, related products, and extra blocks | Major editor sections |
| Product Preview button | `products-03-preview.png` | an existing categorized product editor | Enabled Preview control without opening it | Preview |
| Product Preview needs a category | `products-04-preview-needs-category.png` | `/admin/products/new` | Disabled preview explanation on an unsaved product | Preview needs a category |
| News | `news-01-list.png` | `/admin/news` | Search/filter/sort list and New News | New News and Kind/status columns |
| News and blog editor | `news-02-editor.png` | an existing news item, or `/admin/news/new` if none exists | Kind, Author, Tags, Reading time, status, and content fields | Kind and blog-only fields |
| Industries and applications | `taxonomy-01-industries-applications.png` | `/admin/industries` | Generic list pattern with Catalog sidebar links visible | Industries and Applications sidebar entries |
| Resources | `resources-01-list.png` | `/admin/resources` | Search/filter/sort list and New Resource | New Resource and first Edit link |
| Resources editor | `resources-02-editor.png` | an existing resource, or `/admin/resources/new` if none exists | Resource title, file URL, thumbnail, and status fields | File and status controls |
| Locations | `locations-01-list.png` | `/admin/locations` | Location records with search/filter/sort | New Location and first Edit link |
| Directory | `directory-01-list.png` | `/admin/directory` | Directory list pattern without exposing private details | Directory sidebar entry and list controls |
| Newsletter subscribers | `newsletter-subscribers-01-list.png` | `/admin/newsletter/subscribers` | Masked subscriber list, statuses, Tags panel, Add subscriber, and Export CSV | Add subscriber, Tags, and Export CSV |
| Newsletter campaigns | `newsletter-campaigns-01-list.png` | `/admin/newsletter/campaigns` | Campaign list and New campaign | New campaign |
| Newsletter campaign editor | `newsletter-campaigns-02-editor.png` | an existing draft campaign if one exists | Subject, preview text, audience, blocks, Preview, Send test, Save draft, and Send controls | Preview, Send test, and Save draft |
| Navigation | `navigation-01-editor.png` | `/admin/navigation` | Menu tabs, item hierarchy, external-link control, product picker, and reorder controls | Menu tabs and Add top-level item |
| Media library | `media-library-01-library.png` | `/admin/media` | Images/Documents tabs, search, folders, tags, Edit, and delete affordances | Tabs, search, and Edit |
| Branding workflow | `branding-01-workflow.png` | `/admin/branding` | Save draft, Publish, Reset, Draft/Live preview, and revision area | Save draft, Publish, and preview controls |
| Branding Site layout | `branding-02-site-layout.png` | `/admin/branding` | Classic and Forge choices without changing them | Site layout panel and Forge option |
| Public Forge menu on a phone | `branding-03-forge-mobile-menu.png` | `/` at 390 × 844 | Live Forge home page with the public menu open | Menu button and open menu as ①② |
| Submissions | `submissions-01-inbox.png` | `/admin/submissions` | Masked inbox, New/Read/Archive states, and Export CSV | Status controls and Export CSV |
| Analytics overview | `analytics-01-overview.png` | `/admin/analytics` | Date range, top-line metrics, starred reports, and analytics navigation | Date range and metric row |
| Analytics report categories | `analytics-02-categories.png` | `/admin/analytics/behavior` | A category report with star controls and Analytics sidebar group | Star control and category navigation |
| Settings | `settings-01-form.png` | `/admin/settings` | Contact settings, social links, default image, and Announcement bar | Announcement bar enable/message/link controls |
| Redirects | `redirects-01-list.png` | `/admin/redirects` | Redirect list including the Goes to column | Goes to column and New Redirect |
| Users | `users-01-list.png` | `/admin/users` | Masked staff list, roles, account state, and invite controls | Invite user and role control |
| Audit log | `audit-log-01-list.png` | `/admin/audit-log` | Masked actors and details with actor, entity, action, and date filters | Filter row |
| When something cannot be saved | `save-error-01-alert-dialog.png` | the draft page with an invalid one-column Columns block | Alert dialog explaining the block problem and Go to block | Problem text and Go to block |

## Records the capture script may create

- One draft page titled `PRUEBA CODEX handbook`, reused by exact title on
  later runs. It is never published, unpublished, archived, restored, or
  deleted by the script.
- No media asset is required: the upload controls can be illustrated before
  submitting. If a future version of the script uploads an asset, it must use
  the exact title `PRUEBA CODEX handbook`, keep the file unused, and report it.

## Capture limits

- Existing records are opened read-only. Controls that would publish,
  unpublish, archive, restore, delete, send, invite, save site settings, or
  change navigation are highlighted but never activated.
- The campaign editor shot is omitted with an explicit summary warning when
  no existing draft campaign is available; the script must not create one.
- `products-04-preview-needs-category.png` is omitted when no existing
  uncategorized product exposes that state. The current New product screen
  does not render a Preview control until a product has been saved.
- Names, email addresses, phone numbers, message contents, subscriber rows,
  user rows, and audit actors are blurred before capture. OSI's own public
  contact number may remain visible, but the script masks phone-like text by
  default to avoid relying on recognition.
