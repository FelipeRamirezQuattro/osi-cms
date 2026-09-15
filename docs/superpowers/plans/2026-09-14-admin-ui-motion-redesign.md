# OSI CMS admin UI and motion redesign — implementation plan

> **Do not start this plan until the CMS audit remediation is merged, its migrations are stable, and the working tree is clean.** This plan is deliberately separate so it does not conflict with the content-model, permission, media, form, and shared-section work currently in progress.

**Goal:** Replace the current old-fashioned admin presentation with a calm, modern, responsive workspace that is easy for a non-technical editor to scan and operate. Preserve the public OSI website design; the admin receives its own visual language.

**Reference direction:** Carry forward the useful interaction patterns from `quattro-motion-shape-guide.md` and the Tyche/Quattro Gestión admin: clear grouped navigation, soft surfaces, consistent rounded controls, excellent responsive behavior, immediate feedback, anchored panels, and restrained page-entry motion. Do not copy the Quattro color palette or turn the CMS into a dark/glowing marketing interface.

**Primary feeling:** calm, capable, current, and forgiving.

---

## Evidence from the visual inspection

The local dashboard/products screens and deployed pages, page editor, navigation, and media screens were reviewed at desktop width.

### What is currently wrong

- The public-site display font (`Orbitron`) and wide uppercase tracking are used for ordinary admin headings, buttons, form labels, and table headers. This makes a work interface harder to scan and gives it a dated control-panel look.
- The cream canvas, dark navy slab sidebar, and frequent brand treatments make the admin feel like an extension of the marketing site rather than a neutral editing tool.
- Nineteen flat sidebar links appear in one undifferentiated list. There are no groups, icons, active-page indicator, collapse behavior, responsive drawer, or useful wayfinding.
- The signed-in user area is cramped at the bottom of the sidebar and can be clipped.
- Dashboard cards report only two totals and leave most of the canvas unused. They do not surface drafts, publishing work, content problems, or recent activity.
- List screens are bare tables with no search, filters, sorting controls, pagination summary, bulk affordances, or row action menu.
- Tables have weak row hierarchy and actions are represented by tiny arrows and red text placed far from the content they affect.
- The page editor has useful functionality but visually reads as a collection of bordered rectangles. The save/publish state, selected block, validation state, and separation between content and page settings are weak.
- The block picker is a long native select. Descriptions exist, but they are hidden in option help and do not support visual scanning or search.
- The navigation manager becomes a very long wall of rows. Hierarchy is conveyed mostly by indentation, while editing, adding children, moving, and deleting compete equally on every row.
- The media library is image-forward but metadata and controls are under-designed: the upload area is a raw file input, image names collapse into URLs, filtering has little structure, and selection/edit/delete states are not clear.
- Native `window.confirm`, `window.prompt`, and `window.alert` remain in page, product, entity, form, media, navigation, shared-section, and rich-text workflows.
- The dashboard shell is desktop-only in its current form; a fixed 14rem sidebar plus padded content has no mobile/tablet adaptation.
- Feedback is mostly static text or browser UI. There is no consistent toast, progress, optimistic-state, conflict, empty, or recoverable error treatment.

### What is worth retaining

- The existing information architecture and capability filtering are a sound functional base.
- The two-column page editor concept is appropriate for desktop.
- White content surfaces, compact status pills, and the media thumbnail grid are useful starting patterns.
- The project already includes `motion`, dnd-kit, URL-backed audit filters, and shared capability checks; reuse them.

---

## Design principles

1. **Admin and public styles are separate.** Public pages retain Orbitron/Montserrat and the OSI marketing system. Admin pages use a scoped neutral system.
2. **Plain typography first.** Use a system sans stack for all admin UI. Sentence case replaces decorative uppercase. Monospace is limited to slugs, IDs, and timestamps where it improves comprehension.
3. **Brand through restraint.** OSI navy is the primary action/active color. Gold is a small accent for publishing or a single highlight, never the canvas or general text color.
4. **Neutral surfaces.** Use a cool-gray canvas, white panels, quiet borders, and soft elevation. Avoid cream tint, diagonal motifs, glow pulses, animated meshes, and clipped corners in the admin.
5. **Motion explains change.** Animate navigation, dialogs, drawers, toasts, disclosure, drag/reorder, and state transitions. Do not animate content merely to decorate it.
6. **The common path is obvious.** Search, edit, save draft, preview, and publish must be immediately locatable. Destructive and advanced actions live one level deeper.
7. **Every action is forgiving.** Use inline validation, clear consequences, undo where practical, conflict messaging, and custom confirmation dialogs for irreversible actions.
8. **Keyboard and reduced-motion are first-class.** All operations work without a pointer, and every animation has a non-vestibular equivalent.

---

## Scoped admin design tokens

Create admin-only tokens under an `.admin-root` wrapper. Do not change public OSI tokens to achieve this redesign.

### Typography

- `--admin-font`: `ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- Page title: 1.75rem/1.2, 650–700 weight, tight tracking, sentence case.
- Section title: 1rem/1.4, 600 weight.
- Body/control: 0.875rem/1.5, 400–500 weight.
- Helper/meta: 0.75rem/1.4, 450–500 weight.
- Slugs/IDs only: system monospace at 0.75–0.8125rem.

### Color roles

- Canvas: `#f5f7fa`
- Surface: `#ffffff`
- Muted surface: `#eef2f6`
- Raised/hover surface: `#f8fafc`
- Primary ink: `#17212b`
- Secondary ink: `#667085`
- Border: `#dce3ea`
- Strong border: `#bdc8d4`
- Primary action: OSI navy/steel in an AA-compliant value
- Primary hover: one darker navy step
- Focus: retain the universal high-contrast blue focus ring
- Success, warning, danger, and info each receive text, border, and pale-surface tokens; never communicate state by color alone.

### Shape, spacing, and elevation

- 4px base spacing grid.
- Controls: 10px radius, minimum 44px hit height.
- Cards/toolbars: 14px radius.
- Dialogs/drawers: 18px radius.
- Pills: full radius.
- Resting cards: 1px border plus a very light neutral shadow.
- Floating layers: stronger neutral shadow; no colored glow.
- Maximum working width: 1600px, with fluid 24–40px desktop gutters and 16px mobile gutters.

---

## Motion language

Use the Quattro principles of fast feedback, spatial consistency, and fluid panels, but tune them for a productivity tool.

### Motion tokens

- Press feedback: 90–110ms, scale to 0.98 only for substantial buttons/cards; never scale small text links.
- Hover/focus color: 120–160ms ease-out.
- Page content entry: 180–220ms opacity plus 4–6px vertical movement.
- Popover/menu: 140–180ms opacity plus scale 0.98 from the trigger-aligned transform origin.
- Dialog: 180–220ms opacity plus scale 0.98 and 6px vertical offset; exit mirrors entry.
- Sidebar/mobile sheet: interruptible, critically damped spring, approximately 300–350ms response, no bounce.
- Toast: 180–220ms slide/fade; pause dismissal while hovered or focused.
- Reorder: dnd-kit layout animation with a critically damped spring; the dragged row elevates and scales to 1.01, while neighboring rows move continuously.
- Expand/collapse: animate opacity and a measured grid row/height only when the content relationship benefits from it.

### Motion rules

- Use only `transform` and `opacity` for high-frequency animation.
- No infinite float, pulse-glow, marquee, spinning decoration, or animated gradient in the admin shell.
- No stagger across large tables; it delays scanning and makes filtering feel slow.
- Do not block input while an animation runs. Reopening a closing drawer/dialog must retarget from its current visual state.
- Entry and exit use the same spatial origin and path.
- `prefers-reduced-motion: reduce` replaces movement/springs with short opacity changes or immediate state changes.
- Loading skeletons may use a subtle shimmer only when loading lasts long enough to require a placeholder; reduced motion uses a static tint.

---

## Target shell and information architecture

```text
Desktop
┌──────────────── sidebar (256px) ───────────────┬──────── top bar ────────┐
│ OSI Content                                    │ breadcrumbs   search/user│
│ Overview                                       ├──────────────────────────┤
│ Content                                        │ page title + main action │
│   Pages / Shared sections / Forms / News       │ filters / workspace      │
│ Catalog                                        │                          │
│   Products / Categories / Resources            │                          │
│ Organization                                   │                          │
│   Industries / Applications / Locations / Team │                          │
│ Operations                                     │                          │
│   Media / Submissions                          │                          │
│ System                                         │                          │
│   Navigation / Redirects / Settings / Users    │                          │
│                                                │                          │
│ user card / sign out                           │                          │
└────────────────────────────────────────────────┴──────────────────────────┘

Mobile/tablet
┌──────────────── sticky top bar ───────────────────────────────────────────┐
│ menu  current section                         search / user               │
├───────────────────────────────────────────────────────────────────────────┤
│ breadcrumbs                                                               │
│ page title                                                                │
│ primary action                                                            │
│ filters (wrapping or filter sheet)                                        │
│ cards/table/editor                                                        │
└───────────────────────────────────────────────────────────────────────────┘
```

- Sidebar groups are visible labels, not ambiguous collapsible accordions by default.
- Each destination has a quiet line icon and a visible active state with an animated shared-position indicator.
- Admin/editor capability filtering remains the source of truth for item visibility.
- Desktop sidebar can collapse to icons only; remember the preference locally.
- Mobile sidebar is a modal sheet with scrim, focus containment, Escape/close behavior, and restored trigger focus.
- Top bar contains breadcrumbs, optional global content search/command palette, and an accessible user menu.
- Add a skip link to the main admin content.

---

## Implementation phases

### Phase 0 — Freeze, inventory, and visual regression baseline

**Gate:** Wait for the current remediation plan to finish. Record the final commit SHA, run `pnpm check` and `pnpm build`, and capture a clean status before branching.

**Create/modify:**

- Create screenshot route matrix documentation under `docs/`.
- Add Playwright visual projects for desktop (1440×900), laptop (1024×768), tablet (768×1024), and mobile (390×844).
- Capture login, dashboard, each list archetype, page editor, product editor, entity editor, media library/picker, navigation, submissions, settings, users, audit, forms, shared sections, and every dialog state.

**Acceptance:** Baseline screenshots and keyboard notes exist before visual code changes. No data mutations are necessary for the baseline.

### Phase 1 — Admin-only foundation and primitive library

**Create:**

- `app/admin/layout.tsx` — shared `.admin-root` scope and admin metadata.
- `app/admin/admin.css` — admin tokens, typography, focus, surface, and motion utilities.
- `lib/motion/admin.ts` — typed transitions/variants and reduced-motion helpers.
- `components/admin/ui/button.tsx`
- `components/admin/ui/icon-button.tsx`
- `components/admin/ui/input.tsx`
- `components/admin/ui/textarea.tsx`
- `components/admin/ui/select.tsx`
- `components/admin/ui/search-field.tsx`
- `components/admin/ui/form-field.tsx`
- `components/admin/ui/card.tsx`
- `components/admin/ui/status-badge.tsx`
- `components/admin/ui/async-message.tsx`
- `components/admin/ui/empty-state.tsx`
- `components/admin/ui/skeleton.tsx`
- `components/admin/ui/toast.tsx`

**Requirements:**

- Remove `font-display`, wide tracking, and routine uppercase styling from admin primitives.
- Do not duplicate field label/error/help markup in individual editors.
- Every control has hover, active, focus-visible, disabled, loading, invalid, and read-only states.
- Async messages use `aria-live`; loading buttons retain their width and announce progress.
- Use one consistent icon set. Add a small tree-shakeable icon dependency only if the current codebase has no suitable source.

**Acceptance:** A primitive gallery route (development-only or styleguide section) demonstrates all states in light and reduced-motion modes. Contrast passes WCAG AA.

### Phase 2 — Responsive shell and navigation

**Create/refactor:**

- `components/admin/shell/admin-shell.tsx`
- `components/admin/shell/admin-sidebar.tsx`
- `components/admin/shell/admin-topbar.tsx`
- `components/admin/shell/admin-mobile-nav.tsx`
- `components/admin/shell/admin-breadcrumbs.tsx`
- Refactor `app/admin/(dashboard)/layout.tsx` to compose the shell.

**Requirements:**

- Group the nineteen links according to the target IA above.
- Add icons, active state, role/capability filtering, responsive drawer, and collapsed desktop state.
- Keep the user identity and sign-out action readable at every height; the nav scrolls independently if necessary.
- Add route-aware breadcrumbs and a visible page title region.
- Animate active navigation indicator, drawer, and user menu with the motion tokens.
- No hydration-dependent flash of inaccessible nav items.

**Acceptance:** Works at 320px through 1920px, at 200% text zoom, with keyboard-only navigation and reduced motion.

### Phase 3 — Page headers, filters, lists, and data tables

**Create:**

- `components/admin/ui/admin-page-header.tsx`
- `components/admin/ui/filter-bar.tsx`
- `components/admin/ui/data-table.tsx`
- `components/admin/ui/pagination.tsx`
- `components/admin/ui/row-actions.tsx`
- `components/admin/ui/mobile-record-card.tsx`

**Apply to:** pages, products, categories, news, industries, applications, resources, locations, directory, forms, shared sections, submissions, redirects, users, and audit log.

**Requirements:**

- Every content list gets a persistent search field, meaningful filters, sort, result count, empty state, and pagination where the dataset can grow.
- Store shareable search/filter/sort/page state in URL parameters and preserve it on edit/back navigation.
- Debounce text search; show immediate pending feedback and reject stale responses.
- Desktop/tablet uses a semantic table with a sticky header when useful. Mobile uses record cards for action-heavy tables rather than squeezing columns.
- Primary row click opens edit; secondary actions move into an accessible kebab menu.
- Reordering is a dedicated mode or drag handle with keyboard Move up/Move down actions—not permanent tiny arrow glyphs in every row.
- Selection, pending, conflict, and error states are visually distinct and include text/icon cues.

**Acceptance:** A user can find one record among hundreds using search/filter/pagination; the exact view can be shared by URL; no horizontal page overflow at mobile widths.

### Phase 4 — Custom dialogs, menus, toasts, and destructive workflows

**Create:**

- `components/admin/ui/dialog.tsx`
- `components/admin/ui/confirm-dialog.tsx`
- `components/admin/ui/prompt-dialog.tsx`
- `components/admin/ui/dropdown-menu.tsx`
- `components/admin/ui/toast-provider.tsx`

**Replace all current occurrences of:**

- `window.confirm`
- `window.prompt`
- `window.alert`

This includes pages, products, generic entities, form definitions, media, navigation, shared sections, revisions, and rich-text link insertion.

**Requirements:**

- Dialog title and description are programmatically associated.
- Focus is trapped while modal, restored to the trigger on close, and Escape behavior is predictable.
- Destructive confirmation names the item and consequence. Require typed confirmation only for genuinely high-impact operations, not routine deletes.
- Prompt dialogs provide normal labels, validation, helper text, and disabled submit until valid.
- Dialogs become bottom sheets on narrow screens, enter/exit symmetrically, and use contained overscroll.
- Use a non-modal toast for completion/status. Errors that require correction stay inline near the source.

**Acceptance:** `rg 'window\.(confirm|prompt|alert)' app/admin components/admin` returns no workflow usage. Dialog flows pass keyboard and screen-reader checks.

### Phase 5 — Dashboard as an editorial control center

**Refactor:** `app/admin/(dashboard)/page.tsx` and supporting data queries.

**Add:**

- Drafts awaiting publication.
- Recently edited content with author/status.
- New submissions.
- Broken-link/content-integrity count.
- Media missing required metadata.
- Recent audit activity.
- Quick actions for new page, product, news post, resource, and media upload, filtered by capability.

**Presentation:**

- Compact KPI cards, not giant decorative tiles.
- One primary “Needs attention” panel and one recent-activity list.
- Helpful empty states when all checks are clear.
- Count transitions may cross-fade; do not animate numbers continuously.

**Acceptance:** The dashboard answers “what needs my attention?” and “what changed recently?” without visiting another screen.

### Phase 6 — Page and shared-section editing workspace

**Refactor:** page editor and shared-section editor around common editor-shell primitives while keeping their domain logic separate.

**Requirements:**

- Sticky command bar with back/breadcrumb, draft/published state, last saved state, preview, Save draft, and capability-aware Publish/Unpublish.
- The main canvas uses larger, calmer block cards. Selected/open block has a clear active treatment.
- Block actions move into a compact menu, while visibility and drag handle remain discoverable.
- Add keyboard reorder and explicit Move up/Move down actions.
- Duplicate inserts next to the source.
- Replace the long select with a searchable block palette dialog: category tabs, block name, plain-language description, use case, and small representative icon/thumbnail.
- Validation opens the failing block, scrolls it into view, focuses the exact field, and shows the same error inline.
- Add an unsaved-change indicator and route-leave guard that distinguishes unsaved browser state from saved draft and published state.
- Desktop keeps settings in a sticky right inspector. Tablet uses a collapsible inspector. Mobile uses a settings sheet.
- Reorder, palette, inspector, validation reveal, save feedback, and publish confirmation use the defined motion language.

**Acceptance:** A first-time editor can add, configure, reorder, preview, save, and publish a block with no hidden controls or lost work.

### Phase 7 — Product/entity/form editors

**Refactor:** product, generic entity, settings, form-definition, user, and navigation editors to use the shared form system.

**Requirements:**

- Divide long forms into named cards/sections with a compact local section nav when there are more than five groups.
- Keep the primary save action in a sticky footer/header, not only at the end of a long page.
- Use progressive disclosure for SEO, advanced options, relations, and dangerous actions.
- Arrays/child records use repeatable cards with clear add, reorder, duplicate, and remove controls.
- Navigation becomes a proper tree editor with hierarchy lines, collapse/expand, clear parent/child drag targets, and one row action menu.
- Rich-text toolbar uses icon buttons with tooltips and a custom link dialog.
- Field additions/removals animate locally without shifting the entire page unnecessarily.

**Acceptance:** Every form remains understandable at mobile width and all required/error states are consistently rendered.

### Phase 8 — Media, submissions, audit, and operational screens

**Media:**

- Turn upload into a polished drop zone with browse alternative, file rules, progress, cancel, and per-file validation.
- Give media cards a stable aspect preview, real title/filename, type/dimensions/size metadata, selection state, and one action menu.
- Add list/grid toggle, filter chips, usage count, metadata drawer, and clear replace/delete consequences.
- The picker and full library use the same visual browser primitives.

**Submissions:**

- Use URL-backed status/date/form filters, readable sender summary, relative/absolute timestamps, and a detail drawer.
- Status changes give optimistic feedback and an undo window where safe.

**Audit:**

- Keep advanced filters but place them in the shared filter bar.
- Render diffs in a readable key/value change view instead of raw JSON where possible.

**Acceptance:** Operational screens feel part of the same product and remain usable with large datasets.

### Phase 9 — Authentication, empty/loading/error states

**Refactor:** login, forgot-password, reset-password, admin loading, route errors, and not-authorized states.

**Requirements:**

- Use the admin typography/tokens, persistent labels, autocomplete, reveal-password control, and direct recovery messaging.
- Keep auth pages visually quiet: one centered card, subtle OSI identity, no marketing animation.
- Replace large blank skeleton panels with layout-matched skeletons.
- Standardize permission, conflict, offline, validation, and unexpected-error messages with a next action.
- Page entry and auth feedback honor reduced motion.

**Acceptance:** All entry/recovery states are keyboard-complete, screen-reader clear, and visually consistent.

### Phase 10 — QA, performance, and documentation

**Automated checks:**

- Visual regression at four target widths.
- Playwright keyboard flows for sidebar, filters, tables, dialogs, block palette, editor reorder, media picker, and save/publish.
- Axe on every admin archetype and modal state; no serious or critical violations.
- Reduced-motion test with emulation enabled.
- Search/filter URL-state tests and back-button restoration.
- Verify no native alert/confirm/prompt remains.

**Manual checks:**

- 200% zoom and large-text layout.
- Long titles, emails, slugs, translations, and empty datasets.
- Slow network/save, conflict, failure, retry, and offline states.
- Touch targets and scrolling on real phone/tablet dimensions.
- Motion checked frame-by-frame for jumps, layout shift, and non-interruptible transitions.

**Performance constraints:**

- Prefer Server Components for initial data; client islands own only interactivity.
- Do not ship Motion to static list rows or read-only cards that do not animate.
- Lazy-load large dialogs/editors where it improves first interaction without delaying common actions.
- Animate compositor-friendly properties only and avoid backdrop blur on low-value large surfaces.
- No animation may delay first meaningful paint, save, navigation, or destructive confirmation.

**Documentation:**

- Update `docs/CLIENT-HANDBOOK.md` screenshots and navigation descriptions only after the UI is final.
- Add the admin token/motion rules to `CLAUDE.md` so future screens do not fall back to public marketing styles.
- Record before/after screenshots and any intentionally deferred items.

---

## Recommended delivery slices

1. **Foundation:** Phases 0–2 — tokens, primitives, responsive shell.
2. **Daily workflow:** Phases 3–6 — lists, dialogs, dashboard, page editor.
3. **Complete consistency:** Phases 7–9 — all remaining editors and states.
4. **Release:** Phase 10 — regression, accessibility, performance, and documentation.

Each slice must pass `pnpm check`, relevant Playwright tests, and `pnpm build` before the next slice begins.

---

## Global definition of done

- Admin UI no longer uses Orbitron, wide uppercase tracking, cream/gold marketing treatments, or public-site decorative motifs for routine work.
- All admin routes share one scoped visual system and component library.
- Sidebar is grouped, active, role-aware, collapsible on desktop, and a usable drawer on mobile.
- Every growing list has search, relevant filters, sorting, pagination, and URL-backed state.
- No workflow uses browser-native alert, prompt, or confirm dialogs.
- Page/shared-section editors clearly communicate unsaved, saved-draft, preview, published, conflict, and error states.
- Admin works at 320px, 768px, 1024px, and wide desktop without clipped content or unusable tables.
- Motion is purposeful, interruptible where interactive, and removed/reduced appropriately for user preference.
- All operations are keyboard-completable with visible focus and correctly restored focus after overlays.
- No serious/critical axe findings and no meaningful visual regression outside `/admin`.
- Updated handbook screenshots and instructions match the released admin exactly.

---

## Explicit non-goals

- Do not redesign the public OSI site in this phase.
- Do not copy Quattro’s blue/cyan palette, animated gradient mesh, glow system, or marketing typography.
- Do not add decorative dashboards, charts without a real editorial decision, or motion that exists only to appear modern.
- Do not change content schemas, permissions, publishing semantics, or server-action contracts unless a UI requirement reveals a genuine defect; document such a dependency and handle it as a separate remediation change.
- Do not begin implementation on top of Claude’s active remediation worktree.
