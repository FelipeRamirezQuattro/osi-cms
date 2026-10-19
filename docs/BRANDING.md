# Branding architecture

This document is the developer-facing contract for the OSI CMS branding
system. The editor workflow is documented in `docs/CLIENT-HANDBOOK.md`.

## Configuration and publication

Branding configuration is versioned JSON (`configVersion: 1`) validated by
`lib/branding/schema.ts`. The three persistence layers are:

- `site_branding`: the editable singleton draft and optimistic-concurrency
  version.
- `site_branding_publications`: the singleton public configuration.
- `site_branding_revisions`: immutable publication snapshots available for
  restoration to the draft.

Saving a draft never changes the public site. Publishing validates the
complete resolved configuration in the database transaction, updates the
public singleton, and creates a revision. Public reads fail closed to the
code-owned `OSI_SEED_BRANDING_CONFIG` if the publication is missing or
invalid.

## Public scope and semantic roles

`PublicThemeBoundary` compiles the published configuration into known CSS
custom properties on `.public-site.site-shell`. The admin route graph never
receives this boundary or the public font classes. The compiler accepts a
parsed configuration object, never raw CSS.

Public components should consume semantic roles:

| Purpose | CSS variable |
| --- | --- |
| Primary / secondary identity | `--brand-color-primary`, `--brand-color-secondary` |
| Accessible accents | `--brand-color-accent-on-dark`, `--brand-color-accent-on-light` |
| Light / dark surfaces | `--brand-color-light-surface`, `--brand-color-dark-surface` |
| Text | `--brand-color-text-on-light`, `--brand-color-text-on-dark` |
| Muted text | `--brand-color-muted-text-on-light`, `--brand-color-muted-text-on-dark` |
| Borders | `--brand-color-border-on-light`, `--brand-color-border-on-dark` |
| Focus and status | `--brand-color-focus-indicator`, `--brand-color-error`, `--brand-color-success`, `--brand-color-warning`, `--brand-color-info` |

Tailwind semantic aliases (`bg-brand-surface-dark`,
`text-brand-accent-light`, and related utilities) are defined at the same
runtime boundary. Compatibility aliases for legacy `osi-*` utilities remain
until those call sites can be removed without a visual migration.

The public `/styleguide` route renders the actual published swatches,
semantic role mappings, and font-role keys rather than a duplicated palette.

## Layout themes (classic | forge)

`layout` on the branding config selects how the public site is composed:
`classic` (the default, and what every config saved before the field
existed means) or `forge` — cinematic industrial: full-bleed heroes under a
translucent header, oversized uppercase Rajdhani display type, numbered
section indexes, ruled card grids, a gold metrics band and square corners.
It is an optional field on `configVersion: 1`; the branding RPCs never read
keys beyond `configVersion`, so no migration is needed (`docs/DECISIONS.md`).

- `PublicThemeBoundary` renders `data-theme="classic|forge"` and wraps its
  children in `LayoutThemeProvider` (client motion primitives read it).
- All Forge CSS lives in `app/forge.css`, every selector under
  `.public-site[data-theme="forge"]`, keyed off `BlockRenderer`'s
  `data-block-type` wrapper plus a few `data-*` hooks (`data-site-header`,
  `data-hero-backdrop`, `data-hero-scrim`, `data-card`, ...). Colors come only
  from the `--brand-color-*` roles. Fixed-section blocks that aren't rendered
  by `BlockRenderer` (the product page) use `BlockScope` for the same hook and
  the same resolved `--block-*` variables.
- Forge fixes its display face in code (`--forge-font-display`, Rajdhani).
  Per-block display/heading font overrides are ignored while Forge is on
  (sentence-length headings use the branding heading font, see below).
- The Rajdhani 700 latin face is also self-hosted at
  `public/fonts/rajdhani-700-latin.woff2` (`@font-face "OSI Forge Display"`
  in `app/forge.css`) and preloaded with `react-dom`'s `preload()` by
  `ForgeFontPreload`, rendered only when layout = forge. `next/font`'s own
  preload can't do this: Next hints a font on every route that imports its
  module (a dynamic import still leaks into classic's flight payload). If the
  face is ever re-exported, replace that file and keep the name in sync.
- Under Forge a `stat_grid` on a navy or transparent background is the gold
  metrics band; a cream one stays a ruled cream band. A `section_heading`
  is always left-aligned. Section numbers (01, 02, ...) are a CSS counter on
  `section_heading` titles ONLY — nothing else on a page is numbered, so the
  numbers always match what the editor added. Never stored.
- Long text never takes the uppercase display face: a heading, stat label or
  footer tagline of more than 6 words (`lib/text/long-title.ts`) renders
  `data-long`, and Forge sets it in the branding heading font in sentence
  case; title-length text stays Rajdhani uppercase. Any new component that
  renders an author-supplied heading should spread `{...longTitle(text)}`.
- Forge motion (`lib/motion/forge-motion.ts`): reveal y 24 / scale .992 /
  spring .48s, hero copy rises and the hero photo settles from 1.035, neither
  touching opacity. `useReducedMotion()` collapses every variant to no motion.
- Layout stability: the header always overlaps `<main>` by its own height and
  `<main>` always pads it back, so the loading skeleton, a full-bleed hero and
  an ordinary page share one geometry. Don't make that conditional on page
  content again — it caused CLS up to 1.0.
- **QA hook:** `OSI_LAYOUT_OVERRIDE=classic|forge` forces a layout in a local
  process (ignored when `VERCEL_ENV=production`). Never set it in a deployed
  environment. `tests/e2e/forge-theme.spec.ts` uses it to sweep either theme.

## Typography

`lib/fonts/catalog.ts` is the only source of permitted font keys, role
compatibility, weights, styles, fallback stacks, and licensing metadata. The
nine catalog entries are Orbitron, Montserrat, Poppins, Rajdhani, Fraunces,
Source Sans 3, Inter, System Sans, and System Serif.

Web fonts are statically declared with `next/font`, but only the variable
classes required by the resolved public configuration are attached. Stored
content cannot provide a CSS family, URL, stylesheet, font-feature string, or
uploaded font file.

## Block inheritance

Appearance resolves in this order:

1. Code-owned OSI fallback.
2. Published site typography and surface definitions.
3. Published default for the registered block type.
4. Optional override on the block instance.

Every block has an exhaustive capability declaration in
`lib/blocks/appearance-capabilities.ts`. Editors only see supported surface,
accent, and typography slots. New blocks store an empty `appearance` object,
which means “inherit”; reset removes instance overrides. Legacy blocks that
do not contain `appearance` retain their old `background` behavior through
the compatibility adapter.

Server actions revalidate block appearance against the published branding
configuration. A forged or stale unpublished swatch, preset, font, or
unsupported slot cannot be saved.

## Preview and safety boundaries

The Branding workspace contains a same-origin iframe preview with draft/live
and mobile/tablet/desktop controls. Unsaved values cross the boundary as a
structured message. The receiver verifies the message origin and parses the
complete configuration again before compiling it; arbitrary HTML, CSS, or
JavaScript is not accepted.

The normal authenticated page preview reads the saved branding draft for the
header, footer, logo, and route content. Normal public routes only read the
published configuration.

## Media and token integrity

Draft and published logo references are blocking media usages. Branding
revision references are visible historical usages but non-blocking. Migration
`0035_branding_media_replacement.sql` makes draft/live logo replacement
atomic, changes historical revision logo foreign keys to `ON DELETE SET
NULL`, and adds uniqueness for revision versions.

Brand-token usage discovery scans draft/live branding, block defaults,
current page and shared-section drafts, their publications, and historical
revisions. The current twelve brand swatches are governed slots: the UI lets
administrators rename or recolor them but does not expose destructive swatch
deletion. Therefore a user-facing operation cannot leave a dangling token.

## Adding a block or theme field

When registering a new block:

1. Add its key to the versioned branding schema and the block registry.
2. Add an explicit capability row in `appearance-capabilities.ts`.
3. Add a seeded default in `lib/branding/seed.ts`.
4. Render through `BlockRenderer` and consume block semantic variables.
5. Extend schema, capability, inheritance, and lifecycle tests.

When changing the persisted branding shape, introduce a new configuration
version and an explicit migration path. Do not silently reinterpret version 1
data.

## Operational requirement

Repository migration `0035_branding_media_replacement.sql` must be applied to
the target Supabase project before deploying code that calls its replacement
RPC. Run the normal migration/advisor procedure and regenerate database types
if the generated schema changes.
