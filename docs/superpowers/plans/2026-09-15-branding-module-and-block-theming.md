# OSI CMS branding module and block theming — implementation plan

> **Third-phase gate:** Do not start this plan until the CMS remediation, the admin UI redesign, and the public-site UI/motion redesign are merged, verified, and visually stable. The branding module must parameterize the finished design system; it must not compete with either redesign while their foundations are still changing.

**Goal:** Give an authorized administrator a safe, understandable branding workspace where they can manage the public site's primary logo, brand palette, global typography roles, and defaults for each registered block type. Page editors can then choose approved brand colors and fonts while adding or editing a block, without gaining an unrestricted CSS editor or changing the neutral admin interface.

**Primary outcome:** The final OSI public design remains the exact default theme after this work lands, but a future client can intentionally restyle it through governed brand tokens and previews rather than code changes.

**Primary feeling of the module:** controlled flexibility — simple for ordinary editors, powerful for administrators, and difficult to misuse accidentally.

---

## Relationship to the first two redesign plans

This plan follows:

1. `2026-09-14-admin-ui-motion-redesign.md`
2. `2026-09-15-public-site-ui-motion-redesign.md`

The responsibilities remain deliberately separate:

- The **admin redesign** establishes a calm, neutral productivity interface. Brand choices must not recolor the admin shell or replace its UI font.
- The **public redesign** establishes the polished, interactive OSI visual system and the semantic styling primitives that this module will parameterize.
- The **branding module** changes the public identity through approved tokens, block defaults, and explicit overrides. Its editing interface follows the admin design system, while its isolated preview follows the public design system.

Do not solve branding by applying public CSS variables to `<html>` or `<body>` globally. Branding must be scoped to the public site and authenticated public previews so the admin remains visually stable.

---

## Verification result: what exists today

There is a useful partial foundation, but there is **no branding module yet**.

### Existing foundation to improve and reuse

- `/admin/settings` already provides an admin-only settings form protected by `manage_settings`.
- `site_settings` is an existing singleton used for phone, email, address, map, social links, footer copy, the default social image, and the announcement bar.
- Settings mutations are validated with Zod, audited, and protected by database RLS/capability checks.
- The media library and `MediaPicker` already provide the correct base for selecting a logo image.
- Media usage detection already protects referenced assets from accidental deletion and supports replacement workflows.
- The page and shared-section editors already obtain block definitions from one registry and render common block fields through `BlockFieldsForm`.
- Every block extends a common schema containing background, top/bottom spacing, and anchor ID.
- The project already has an authenticated page-preview route and a public styleguide.
- The public site already uses central CSS theme tokens and shared motion primitives.

### Missing branding capabilities

- `site_settings` has no logo, palette, font, typography-role, surface-preset, or per-block-default fields.
- The primary mark is the hardcoded text `OSI` in the header, footer, and mega-menu rather than an administrator-selected media asset.
- Orbitron, Montserrat, and Poppins are loaded statically in the root layout and exposed through fixed global variables.
- OSI navy, cream, gold, steel, and slate values are fixed in `app/globals.css` and referenced directly by public components.
- Common block appearance is limited to the closed `navy | cream | transparent` background enum.
- Individual renderers contain many direct `font-display`, `bg-osi-*`, `text-osi-*`, and `border-osi-*` decisions.
- Blocks do not declare which appearance controls make sense for them. An image-only block and a rich-text block currently receive the same common background fields.
- There is no global typography-role editor, block-type default editor, or per-instance font selector.
- There is no safe contrast validation for administrator-selected colors.
- There is no draft/publish/rollback workflow for a site-wide visual change.
- The current preview reflects the last saved page draft, but there is no branding draft to preview and no isolation for unsaved theme values.

### Audit conclusion

Improve the existing settings, capability, validation, media, registry, audit, and preview foundations, but create a dedicated **Branding** module and data contract. Do not overload the current general `site_settings` row with an opaque collection of unrelated visual controls.

---

## Product model: three levels of inheritance

Every configurable appearance value follows one predictable cascade:

```text
Safe built-in OSI fallback
        ↓
Published site-wide brand defaults
        ↓
Published default for this block type
        ↓
Optional override on this block instance
```

### Level 1 — Site-wide brand defaults

Administrators define:

- Primary logo.
- Approved brand color swatches.
- Semantic color roles and accessible surface presets.
- Available font selection from the safe font catalog.
- Default font for display, heading, body, and interface/label roles.

### Level 2 — Defaults by block type

Administrators can set defaults for each registered block type, such as:

- `hero_full`: primary-dark surface, accent color, display heading font, body font.
- `rich_text`: light-reading surface, heading font, body font.
- `cta_band`: primary-dark surface, accent action color, heading font.
- `quote_testimonial`: light or dark editorial surface, quote/body font, accent.

These are defaults, not copied values. Changing the default later updates all instances that still inherit it.

### Level 3 — Block-instance overrides

While adding or editing a block, an editor can choose from approved values for the slots that block supports:

- Surface preset or transparent/inherit behavior.
- Accent swatch.
- Heading font.
- Body font.
- Label/interface font when relevant.

Every selector defaults to **Use block default**. The editor can reset an overridden value to inheritance at any time.

### Why this hierarchy is required

- It gives the client real flexibility without forcing repetitive choices on every block.
- It avoids saving raw hex colors and raw font-family strings across hundreds of block JSON records.
- A brand refresh can update inherited blocks globally.
- Exceptional sections can still receive deliberate local treatment.
- The editor can explain exactly why a block looks the way it does.

---

## Branding contract

### Brand color swatches

Each swatch has:

- Stable, non-editable ID.
- Editable human name, such as “Primary navy” or “Signal orange.”
- Opaque six-digit hex value.
- Optional short usage note.
- Built-in/custom status.

Rules:

- Seed the final OSI palette from the completed public redesign.
- Permit custom swatches, but cap the active palette at a sensible number, recommended 12, to keep selection usable.
- Store references by stable ID, never by display name or raw hex value.
- Renaming or recoloring a swatch updates every inheriting use.
- A referenced swatch cannot be deleted until its usages are reassigned.
- Disallow alpha values for core swatches; transparency belongs to a surface preset or component treatment, where contrast can be evaluated.
- Normalize accepted input to uppercase `#RRGGBB` and reject CSS functions, URLs, variables, gradients, and arbitrary strings.

### Semantic color roles

Swatches are mapped to stable roles used by the public design system:

- Primary.
- Secondary.
- Accent.
- Light surface.
- Dark surface.
- Text on light.
- Text on dark.
- Muted text on light.
- Muted text on dark.
- Border on light.
- Border on dark.
- Focus indicator.
- Error, success, warning, and information.

The interface labels roles in plain language and explains where they appear. Component code consumes roles, not OSI-specific color names.

### Surface presets

A surface preset is an accessible combination, not just a background color:

- Background swatch.
- Primary text swatch.
- Muted text swatch.
- Accent swatch.
- Border swatch.
- Optional appearance mode: solid or transparent/inherit.

Seed presets corresponding to the completed design's primary dark, reading light, technical plate, and transparent/inherit contexts.

Rules:

- Normal and muted text/background pairs must meet WCAG AA before the preset can be published.
- Essential border/focus/icon pairs must meet the non-text contrast requirement.
- The color picker continuously displays contrast ratios and pass/fail labels; color alone never communicates the result.
- An advanced custom combination may be saved as a draft with warnings, but publishing is blocked if required contrast fails.
- Do not automatically change an administrator's selected color silently. Offer a suggested accessible alternative and let the administrator choose it.

### Font catalog

Font selection comes from a vetted, code-owned catalog. Each entry defines:

- Stable key.
- Family and fallback stack.
- Source and licensing note.
- Available styles and weights.
- Supported character subsets/languages.
- Allowed typography roles.
- Loading strategy and sample strings.
- Status: available, deprecated, or unavailable.

Initial catalog requirements:

- Include the final OSI trio so the default appearance does not change.
- Include a restrained set of readable alternatives across industrial/geometric, editorial, humanist, and neutral families.
- Include system-sans and system-serif fallbacks.
- Do not accept an arbitrary font URL, CSS import, or font-family string from the admin.
- Do not load every catalog font eagerly. Only published selections should be requested on public pages; preview loads only the draft selections being demonstrated.
- Use `font-display: swap` or `optional`, reserve layout appropriately, and preload only the genuinely critical published face/weight.

Arbitrary font-file uploads are not part of the initial module. They require separate decisions for licensing, WOFF2 validation, storage MIME rules, CSP/CORS, malware handling, weight/style metadata, and deletion protection. A client-specific font can first be added to the vetted catalog by a developer and then selected without further component changes.

### Typography roles

The public design system exposes four stable roles:

- **Display:** short heroes, major product names, and selected statistics.
- **Heading:** section, article, result, card, and long-form headings.
- **Body:** paragraphs, lists, captions, long descriptions, and form input text.
- **Interface/label:** navigation, buttons, eyebrows, filters, metadata, and compact controls.

The administrator chooses a catalog font for each role. Existing font size, line height, weight, capitalization, and tracking remain component/design-system responsibilities. This phase does not turn the CMS into a desktop-publishing tool.

### Primary logo

- Select the logo from the existing media library using an image-only picker.
- Show its filename, dimensions, MIME type, intrinsic aspect ratio, and preview against light and dark surfaces.
- Require a meaningful accessible brand name, defaulting to “Odessa Separator Inc.”; do not use “logo” as the entire alt text.
- Preserve intrinsic proportions. The administrator can choose a documented header size preset, not arbitrary width/height distortion.
- Header, footer, and mega-menu use the same published primary logo.
- If no logo is selected or the asset fails, render the current accessible `OSI` text wordmark fallback.
- Extend media-usage detection and replacement so a published or draft primary logo cannot be deleted silently.
- Do not permit SVG upload through the existing unsanitized media path. A vetted, repository-owned SVG may be cataloged by a developer; uploaded primary logos initially use the safe image formats already supported.

---

## Block appearance capability model

Not every block should show every brand control. Extend each block definition with declarative appearance metadata.

Conceptual contract:

```ts
appearance: {
  surface: "none" | "inherit" | "selectable";
  accent: boolean;
  typographySlots: Array<"display" | "heading" | "body" | "label">;
  allowedSurfacePresetKinds?: Array<"solid" | "transparent">;
}
```

The exact TypeScript shape may change during implementation, but the behavior must remain declarative and registry-driven.

Examples:

| Block family | Surface | Accent | Typography slots |
| --- | --- | --- | --- |
| Full/page/product hero | selectable | yes | display, body, label |
| Section heading | selectable | yes | heading, label |
| Rich text/columns | selectable | optional | heading, body |
| CTA/benefits/feature cards | selectable | yes | heading, body, label |
| Quote/testimonial | selectable | yes | heading or quote, body/attribution |
| Stats/specification table | selectable | yes | display/heading, body, label |
| Forms/contact | selectable | yes | heading, body, label |
| Image/gallery/embed/video | selectable | optional | heading, body when those fields exist |
| Logo strip | selectable | optional | label only when fallback names render |
| Shared section reference | inherit from referenced output | no direct override | none at reference level |

Rules:

- The block registry is the only source of truth for visible appearance controls.
- Image-only and structural blocks do not receive meaningless font selectors.
- A shared-section reference does not silently override every block inside the shared section. Edit the shared section's own blocks or introduce an explicit, documented theme-boundary feature later.
- Renderer schemas accept an optional `appearance` object with `inherit`/stable IDs; legacy blocks without it remain valid.
- Unknown/deleted token or font references fall back deterministically and produce an admin diagnostic, never a broken public page.

---

## Data and publication architecture

Branding is a site-wide, high-impact change and therefore requires draft and publish separation.

### Recommended tables

#### `site_branding`

Admin-readable singleton containing:

- Boolean singleton ID.
- Draft branding configuration JSON.
- Draft primary-logo media ID.
- Draft version.
- Updated timestamp and user.

#### `site_branding_publications`

Public-readable singleton snapshot containing:

- Boolean singleton ID.
- Published branding configuration JSON.
- Published primary-logo media ID.
- Published version.
- Published timestamp and user.

#### `site_branding_revisions`

Admin-readable immutable publication snapshots containing:

- Revision ID.
- Branding configuration.
- Primary-logo media ID.
- Version.
- Publisher and timestamp.

### Why draft and public data are separate

- Public RLS can expose the published snapshot without exposing an unfinished draft.
- A partial or invalid branding edit never changes the live site.
- Preview can deliberately request the draft while ordinary routes only request the publication.
- Atomic publication and rollback match the CMS's existing page/shared-section mental model.

### Mutation model

- Save draft, publish, restore revision to draft, and reset draft to published use database functions where multiple writes must succeed together.
- Publishing validates the entire palette, surface presets, font keys, role assignments, logo reference, and block-type defaults again on the server.
- Publishing writes a revision and swaps the public snapshot atomically.
- All mutations require the existing `manage_settings` capability unless a future role model creates a genuine need for `manage_branding`.
- RLS and function authorization independently enforce the same rule.
- Audit records contain changed role/token names and versions, not an unreadable full JSON dump.

### Configuration schema versioning

- Store an explicit configuration schema version.
- Parse every read through a version-aware Zod schema.
- Provide deterministic upgrade functions between versions before adding future roles or controls.
- Never cast database JSON directly to a trusted branding type.

---

## Runtime theme architecture

### Public scope

- Add a `.public-site` theme boundary in public and public-404 layouts.
- Resolve the published branding configuration on the server.
- Emit sanitized CSS custom properties before visible content renders.
- Keep default OSI values in code as the final fallback for database failure, absent publication, or invalid references.
- Public components consume semantic properties such as surface, on-surface, accent, heading font, and body font rather than hardcoded OSI color utilities.

### Admin scope

- `.admin-root` continues using the admin plan's neutral tokens and UI font.
- Never apply selected public fonts, logo sizing, public surfaces, or accent colors to admin navigation, tables, forms, dialogs, or notifications.
- Brand swatches appear in the editor only as labeled samples and preview content.

### Block resolution

At render time, resolve appearance once using:

1. Safe OSI fallback.
2. Published global roles.
3. Published default for the current block type.
4. Valid instance overrides.

Apply resolved values as sanitized CSS custom properties at the block boundary. Update shared section/renderer mechanics so variables inherit without forcing every nested component to fetch branding independently.

### Tailwind and dynamic values

- Do not generate dynamic Tailwind class names from database values; Tailwind cannot reliably discover them and raw values create an injection boundary.
- Keep literal structural classes for layout and state.
- Use validated CSS custom properties for runtime color/font values.
- Introduce semantic utilities/components that reference those properties.
- Do not overload a single color variable so that changing a background accidentally changes unrelated text, border, or accent roles.

### No flash of the default theme

- Resolve and render theme variables server-side in the initial response.
- Do not fetch branding in a client effect after hydration.
- The default fallback and the seeded published configuration must match exactly.

---

## Branding module experience

Create a dedicated `/admin/branding` destination under the admin's System/Appearance group. Keep `/admin/settings` for operational and contact configuration.

### Module sections

1. **Overview** — publication status, last editor, last published time, active logo, palette and typography summary.
2. **Logo** — media picker, accessible brand name, size preset, light/dark previews.
3. **Colors** — swatch manager, semantic-role mapping, surface-preset builder, contrast matrix.
4. **Typography** — font catalog browser, role assignment, multilingual/sample preview, loading notes.
5. **Block defaults** — searchable categorized list of every registered block and its supported appearance slots.
6. **Preview and history** — responsive preview, draft/live comparison, revisions, restore-to-draft.

### Editor behavior

- Use the completed admin design primitives: normal system typography, neutral surfaces, custom dialogs, toasts, inline errors, and a sticky save/publish command area.
- Clearly distinguish `Unsaved`, `Draft saved`, `Different from live`, `Publishing`, and `Published` states.
- Color controls include a text field for exact hex entry and an accessible native color input; neither exists without the other.
- Swatches always show names and hex values, not color alone.
- Font cards show the same meaningful sample across choices and identify the role/weights they support.
- Block defaults can be filtered by block category and searched by label.
- Provide `Reset to site default` per field and `Reset block defaults` with a custom confirmation dialog.
- Deleting a used custom swatch opens a reassignment workflow listing global roles, block-type defaults, draft blocks, published blocks, and shared sections that reference it.
- Preserve unsaved-change protection and restore focus after dialogs/sheets.

### Preview behavior

Use two distinct preview modes:

- **Live sample preview:** an isolated iframe/component fixture responds to sanitized unsaved form changes without saving. It contains representative hero, heading, body, button, card, form, logo, and dark/light surfaces.
- **Preview on site:** after saving the branding draft, an authenticated preview route renders a chosen real page using the saved page draft and saved branding draft.

Requirements:

- Preview has desktop, tablet, and mobile viewport controls.
- Preview is isolated from admin CSS so selected public fonts/colors cannot leak into the admin.
- Draft and live can be compared side by side or with an explicit toggle.
- The preview identifies contrast failures and missing fonts/assets without pretending those states are publishable.
- Moving the existing preview route to a dedicated route group is acceptable if needed so draft branding can style page content and shared header/footer together while preserving the `/preview/...` URL.

---

## Page-editor integration

The branding module defines approved values; the page/shared-section editors consume them.

### Block appearance panel

- Add a clearly labeled **Appearance** section separate from Content and Spacing.
- Generate its controls from the block definition's appearance capabilities.
- Show the inherited source beside each control: `Site default`, `Hero default`, or `Custom for this block`.
- Surface selection uses visual preset cards with names and foreground/accent samples.
- Accent and font selection use compact searchable selectors with a preview, not long native lists.
- Changing a block type resets incompatible appearance overrides and retains compatible ones only after explicit validation.
- Duplicating a block copies its intentional overrides.
- Newly added blocks contain no redundant copied defaults; they inherit until the editor changes something.

### Editor safeguards

- Only published brand tokens/fonts appear to ordinary page editors. Branding admins preview draft tokens inside Branding or authenticated draft preview.
- If a token is deprecated but still referenced, continue rendering it and label it for reassignment.
- Block controls never expose raw CSS, arbitrary class names, gradients, URLs, font sizes, line heights, or letter spacing.
- A chosen foreground/background pair that fails required contrast cannot be published.
- Make the entire feature keyboard-operable; swatch controls are named buttons/radios rather than unlabeled color squares.

### Shared sections

- Shared-section blocks use the same appearance panel and inheritance rules.
- Publishing a brand change updates all inherited shared-section appearances through the brand publication only.
- Publishing a shared-section content change remains a separate action.
- Preview must make clear whether it is showing live or draft branding and live or draft shared-section content.

---

## Implementation phases

### Phase 0 — Freeze, inventory, and token migration map

**Gate:** Confirm the remediation and both redesign plans are complete. Record commit SHAs, checks, visual baselines, and a clean working tree.

**Actions:**

- Inventory final public colors, font roles, direct OSI utility usage, logos/wordmarks, block backgrounds, and route-level hardcoded styles.
- Inventory every registered block and assign its appearance capabilities.
- Document the final OSI fallback configuration from the completed public redesign.
- Capture visual baselines for home, product listing/detail, contact, search, news/resources, content blocks, 404/error, header/menu/footer, and preview.
- Decide the initial vetted font catalog and record source/license/subset/weight information.
- Record the current public theme payload and font-loading behavior.

**Acceptance:** A checked token migration matrix exists and every public color/font use is classified as structural, semantic, content-specific, or intentionally fixed.

### Phase 1 — Branding database, validation, permissions, and audit

**Create:**

- New migration after the current latest migration for branding draft, publication, and revision tables.
- Atomic save/publish/restore/reset functions.
- RLS policies and grants.
- Generated database types.
- Branding Zod schemas and version upgrade helpers.
- Branding data/actions modules and unit/integration tests.

**Requirements:**

- Seed draft and published records with the exact final OSI configuration.
- Public reads can access only the published snapshot.
- Draft/history access and all mutations require `manage_settings`.
- Validate hex values, stable IDs, unique names, font catalog keys, role references, surface contrast, block-type keys, supported appearance slots, and logo media references.
- Publish and revision writes are atomic and audited.

**Acceptance:** Unauthorized users cannot read drafts or mutate branding; a failed publish leaves the live theme and revision history unchanged.

### Phase 2 — Font catalog and server-side theme compiler

**Create/refactor:**

- Code-owned font registry with static imports or self-hosted declarations.
- Server-only branding configuration resolver.
- Theme compiler from validated configuration to safe CSS custom properties.
- Public theme boundary and fallback.
- Unit tests for deterministic output and injection rejection.

**Requirements:**

- Unknown font keys and invalid configuration fall back safely.
- Only used font families/weights load on public pages.
- No user-provided string is interpolated into CSS without strict parsing/mapping.
- Generated variable names come from code-owned semantic roles or sanitized stable IDs.
- Admin pages do not receive public theme variables or font requests.

**Acceptance:** Initial server HTML contains the published theme; there is no client-side theme flash and the seeded theme matches the pre-module screenshots.

### Phase 3 — Semantic public-token migration

**Refactor:**

- Public layout, header, mega-menu, announcement bar, footer, public UI primitives, error/not-found surfaces, and all non-block public routes.
- `Section` and shared public surface/text/accent utilities.
- Public typography utilities for display, heading, body, and label roles.

**Requirements:**

- Replace direct OSI palette/font decisions with semantic variables where they are legitimately brand-configurable.
- Retain fixed safety/system colors where appropriate, including focus/error behavior that cannot rely on an arbitrary brand choice.
- Keep layout, spacing, animation, responsive behavior, and content semantics unchanged during this migration.
- Scope all public styles under `.public-site` or an equivalent boundary.

**Acceptance:** Visual regression shows no unintended change under the seeded OSI branding, and changing a test publication updates every intended global surface without affecting admin screenshots.

### Phase 4 — Block capability metadata and appearance resolution

**Refactor:**

- Common block appearance schema.
- Block-definition appearance metadata.
- Registry serialization for the editor.
- `BlockRenderer`/block boundary appearance resolver.
- Block renderers that currently hardcode fonts or public colors.

**Requirements:**

- Existing block JSON remains valid.
- Legacy `navy`, `cream`, and `transparent` backgrounds map deterministically to seeded surface presets.
- Each renderer consumes semantic block variables only for declared slots.
- Invalid/deleted references fall back and generate actionable admin diagnostics.
- Shared-section recursion and cycle guards continue to work.

**Acceptance:** Every registered block has a documented capability declaration and passes default, inherited, overridden, missing-token, and legacy-data tests.

### Phase 5 — Branding admin module

**Create:**

- Branding route and navigation entry.
- Overview/status header.
- Logo panel and media integration.
- Color/swatches editor.
- Semantic-role and surface-preset editor.
- Typography/font-role editor.
- Block-type defaults editor.
- Revision/history and publish dialogs.

**Requirements:**

- Use only completed admin primitives and admin tokens.
- Apply progressive disclosure: ordinary users see roles/presets first; detailed swatch mappings live in advanced sections.
- Support keyboard, screen reader, 200% zoom, 320px width, touch, reduced motion, pending, validation, conflict, and server-error states.
- Replace every destructive/native browser confirmation with the admin dialog system.
- Save draft independently from Publish.

**Acceptance:** An authorized administrator can change a draft logo, palette, typography roles, and a block-type default, preview them, publish them, and restore a prior revision without developer intervention.

### Phase 6 — Page and shared-section editor controls

**Refactor:**

- `BlockFieldsForm` and block editor inspector grouping.
- Client-safe block palette metadata.
- Appearance selectors and inherited-value indicators.
- Draft validation/save/publish paths for page and shared-section blocks.

**Requirements:**

- Controls appear only when declared by the block capability model.
- Page editors choose only published approved tokens/fonts.
- New blocks inherit without copying values.
- Existing block overrides survive reorder, duplicate, revision, publish, and restore.
- Token usage can be discovered for safe deletion/reassignment.

**Acceptance:** A page editor can add a block, understand its inherited appearance, override supported color/font slots, reset them, preview, publish, restore a revision, and see the same result after reload.

### Phase 7 — Isolated live and real-page previews

**Create/refactor:**

- Isolated branding fixture preview.
- Sanitized unsaved configuration bridge.
- Responsive viewport controls.
- Draft/live comparison.
- Authenticated real-page preview using both saved page draft and saved branding draft.

**Requirements:**

- Admin styling never leaks into the preview and preview branding never leaks into admin controls.
- Header, footer, logo, route content, and blocks use the same draft branding in real-page preview.
- Unsaved preview accepts only already validated structured values, not arbitrary HTML/CSS.
- Focus does not become trapped unexpectedly between editor and preview iframe.
- Preview remains usable with reduced motion.

**Acceptance:** The administrator can validate a brand change on representative fixtures and an actual page at desktop, tablet, and mobile widths before publication.

### Phase 8 — Media usage, compatibility, and migration hardening

**Refactor:**

- Media usage scanning/replacement for draft and published branding logos.
- Brand-token usage scanning across pages, publications, shared sections, and block-type defaults.
- Compatibility adapter for legacy block backgrounds.
- Diagnostics for deprecated/unavailable fonts or tokens.

**Requirements:**

- Referenced logo assets cannot be deleted without replacement.
- Used swatches cannot be deleted without a complete reassignment.
- Reassignment is atomic where it changes multiple stored records.
- Historical page/brand revisions remain renderable with deterministic fallbacks.
- Do not rewrite all block JSON solely to replace values that can be interpreted safely through the adapter.

**Acceptance:** Deletion/replacement workflows list every usage and cannot leave a live page with a dangling brand reference.

### Phase 9 — Accessibility, performance, visual regression, and handoff

**Verify:**

- Contrast matrix for every publishable surface preset.
- Logo legibility and proportions on light/dark/mobile/header/footer contexts.
- Font availability, fallback, language coverage, weight synthesis, loading, and CLS.
- All blocks at target viewport widths, 200% zoom, keyboard, screen reader, forced colors, and reduced motion.
- Core Web Vitals and bundle/font payload against the Phase 0 baseline.
- Admin/public style isolation.

**Documentation:**

- Update `docs/CLIENT-HANDBOOK.md` with Branding, draft/publish, logo recommendations, colors, contrast, fonts, inheritance, block overrides, reset, and rollback.
- Update the public design-system/styleguide documentation with semantic roles.
- Record architecture and security decisions in `docs/DECISIONS.md`.
- Create the Claude handoff with migrations, configuration version, font catalog, screenshots, checks, and known limitations.

**Acceptance:** Automated tests, typecheck, lint, production build, axe, Lighthouse, visual regression, and real-device smoke checks pass with default and intentionally altered test branding.

---

## Validation and safety rules

### Color

- Accept opaque `#RRGGBB` only for stored swatches.
- Enforce unique stable IDs and human-readable names.
- Validate role and preset references.
- Require at least 4.5:1 for ordinary text and 3:1 for essential non-text boundaries/icons.
- Treat muted text as ordinary text unless the renderer guarantees large-text semantics.
- Keep an accessible system focus fallback if the chosen brand focus color cannot work across all surfaces.

### Typography

- Accept catalog keys only.
- Validate that selected weights/styles exist for the assigned role.
- Prevent deprecated/unavailable fonts from new selections while continuing safe fallback for old references.
- Never permit raw CSS, external stylesheet URLs, or font-feature strings from CMS content.
- Body and interface roles must meet readability requirements; decorative catalog fonts may be restricted to display/heading slots.

### Logo

- Require an existing image media asset.
- Reuse existing MIME, file-size, and media-metadata validation.
- Preserve aspect ratio and reserve stable dimensions.
- Validate the accessible brand name and show fallback behavior.
- Block or safely reassign deletion.

### Publishing

- Validate the complete resolved theme, not only the field most recently edited.
- Warn about non-blocking aesthetic issues, but block structural, reference, security, font-availability, and contrast failures.
- Use optimistic concurrency/version checks so one administrator cannot overwrite another administrator's newer draft silently.
- A failed publish never partially updates public tokens, block defaults, or logo.

---

## Test matrix

| Area | Required cases |
| --- | --- |
| Branding schema | valid OSI seed, malformed hex, duplicate IDs, missing role, unknown font, invalid block key, bad schema version |
| Permissions/RLS | anonymous published read, anonymous draft denial, editor denial, admin draft/save/publish/history access |
| Publication | atomic success, validation failure, concurrency conflict, revision creation, restore-to-draft, rollback publication |
| Theme compiler | deterministic CSS, escaping/injection attempts, missing config, missing token, deprecated font, fallback output |
| Fonts | each role, unavailable weight, fallback stack, only selected fonts requested, no admin font leakage |
| Logo | select, clear/fallback, bad MIME, missing asset, deletion blocked, atomic replacement, light/dark previews |
| Block inheritance | built-in fallback, site default, type default, instance override, reset, legacy background mapping |
| Block capability | correct controls per renderer, no controls for unsupported slots, shared-section behavior |
| Page lifecycle | add, duplicate, reorder, save draft, preview, publish, revision restore with overrides intact |
| Accessibility | named swatches, keyboard color input, contrast messages, dialog focus, preview labels, 200% zoom |
| Visual regression | default OSI unchanged, alternate accessible brand, long font metrics, missing logo, all block families |
| Performance | server-rendered theme, no flash, font payload, LCP/CLS, no extra branding fetch per block |

---

## Definition of done

- A dedicated Branding module exists; general contact/operational settings remain separate.
- The module is available only to administrators with the appropriate capability.
- The completed admin visual system remains neutral and unchanged by public brand selections.
- The completed public redesign is preserved exactly by the seeded OSI branding configuration.
- Administrators can manage the primary logo, approved palette, semantic roles, surface presets, global typography roles, and defaults for every applicable block type.
- Page/shared-section editors can select approved colors and fonts for supported block instances or leave them inherited.
- Every appearance field identifies its inherited source and can be reset.
- Brand edits are drafts until explicitly published and can be previewed and rolled back.
- Public routes read only published branding; authenticated previews can read draft branding.
- Runtime theming uses validated semantic CSS variables, never dynamic Tailwind class construction or raw administrator CSS.
- All color combinations required for publication pass contrast rules.
- Font selection is limited to the vetted catalog and loads only necessary public assets.
- The primary logo uses the media library, preserves proportions, has an accessible name, and participates in usage/replacement protection.
- Legacy blocks render unchanged and remain editable without a mass destructive data rewrite.
- Every registered block declares its appearance capabilities and has inheritance/override tests.
- Visual regression, accessibility, performance, typecheck, lint, tests, and production build pass.
- The client handbook, decisions record, styleguide, and Claude handoff are updated.

---

## Non-goals

- Recoloring or re-fonting the admin interface from public branding settings.
- Exposing arbitrary CSS, Tailwind classes, JavaScript, HTML, gradients, or external stylesheet URLs.
- Giving every block controls for font size, weight, tracking, line height, border radius, shadow, animation, or layout geometry.
- Loading every catalog font on every page.
- Supporting arbitrary uploaded font files before licensing, sanitization, storage, CSP, metadata, and deletion rules are designed.
- Automatically recoloring raster logos or modifying their proportions.
- Letting a shared-section reference override all nested block styling implicitly.
- Combining branding publication with page or shared-section publication into one ambiguous action.
- Replacing the admin and public redesign plans; this phase parameterizes their completed result.

---

## Recommended delivery sequence

Deliver after the first two redesign plans as small, independently reviewable pull requests:

1. Final-token inventory, OSI seed configuration, and font-catalog decision.
2. Database/RLS/functions/schema versioning, validation, actions, and audit.
3. Font registry, theme compiler, public scope, and no-flash fallback.
4. Semantic migration of public shell and public UI primitives.
5. Block capability metadata, compatibility adapter, and semantic renderer migration.
6. Branding overview, logo, colors, typography, and publication UI.
7. Block-type defaults and page/shared-section appearance controls.
8. Isolated live preview, real-page draft preview, and revision history.
9. Usage/reassignment protection, compatibility hardening, and diagnostics.
10. Accessibility, performance, visual regression, handbook, decisions, and Claude handoff.

Each pull request must include tests, before/after screenshots where visual output changes, default-OSI regression evidence, an alternate-brand fixture, accessibility notes, and commands run. Do not combine unrelated CMS schema work or redesign cleanup with this phase.
