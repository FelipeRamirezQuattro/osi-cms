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
