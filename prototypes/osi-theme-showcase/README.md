# OSI theme comparison prototype

## Purpose

This is a design-validation side project for comparing five visual directions for the OSI public website. It is intentionally not a production theme implementation. Every homepage uses the same static content model so reviewers compare visual hierarchy, tone, and interaction—not different copy.

## Isolation strategy

- All content, components, styling, original imagery, and review screenshots live in `prototypes/osi-theme-showcase/`.
- Six thin App Router entries live in `app/(theme-prototype)/`. The route group has its own layout, metadata, font loading, and stylesheet.
- The prototype imports no CMS repositories, database clients, auth modules, server actions, analytics, or external services.
- No dependency, environment, database, schema, migration, API contract, or deployment change was added.
- `proxy.ts` contains a narrow allow-list for these six static routes. Without it, the existing database-backed soft-404 guard rewrites routes that have no CMS record. No other proxy behavior changed.

## Run locally

From the repository root:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000/theme-showcase](http://localhost:3000/theme-showcase). Next.js may select another port when `3000` is already in use; use the URL printed by the dev server.

Production preview:

```bash
pnpm build
pnpm start
```

## Routes

| Route | Direction |
| --- | --- |
| `/theme-showcase` | Comparison gallery and decision matrix |
| `/forge` | Forge — Cinematic Industrial |
| `/vector` | Vector — Precision Technology |
| `/horizon` | Horizon — Sustainable Progress |
| `/fieldwork` | Fieldwork — Human Industrial |
| `/signal` | Signal — Editorial Enterprise |

Each concept has a persistent selector, a return-to-comparison action, keyboard-visible focus states, a skip link, and intentionally composed mobile behavior.

## Architecture

- `content.ts`: one shared, static OSI content model plus theme decision data.
- `theme-page.tsx`: shared semantic sections and theme-specific hero recipes.
- `comparison-gallery.tsx`: gallery, concept summaries, palettes, tradeoffs, and decision matrix.
- `theme-selector.tsx`: persistent cross-theme navigation.
- `prototype-logo.tsx`: the shared production `BrandLogo` renderer and its single future asset handoff point.
- `motion.tsx`: theme-specific critically damped springs, scroll reveals, hero/media entrances, reduced-motion behavior, and scroll progress.
- `icons.tsx`: one local SVG line-icon family.
- `showcase.css`: namespaced base primitives, semantic theme tokens, five visual recipes, and responsive behavior.
- `public/*.webp`: three original, locally stored prototype images.
- `screenshots/`: full-page desktop and mobile browser captures for all five directions.
- `tests/e2e/theme-showcase.spec.ts`: route, gallery, responsive overflow, keyboard focus, accessibility, and screenshot coverage.

## Theme summary

All five directions are locked to OSI's production navy, cream, gold, steel, slate, and sand system. The comparison is intentionally about composition, typography, geometry, imagery, density, and motion—not alternative brand colors.

- **Forge** — the most cinematic and authoritative. Strong for global industrial scale; highest ongoing photography burden.
- **Vector** — the most technical and engineered. Strong for complex products and measurement; needs a disciplined diagram language.
- **Horizon** — the most open and responsibility-led. Strong for lifecycle and efficiency stories; every claim needs strong evidence.
- **Fieldwork** — the most practical and human. Strong for service, safety, and careers; authentic worker-led photography is essential.
- **Signal** — the balanced enterprise baseline. Strongest general-purpose information architecture and lowest expected production complexity.

## Static content and limitations

- Public OSI facts and product names were derived from the repository's legacy public content. Proof points are labeled for verification before production use.
- The featured field story and resource titles are explicitly illustrative placeholders.
- Header, CTA, and footer links demonstrate navigation states only. No form, search, CMS, account, or backend action is connected.
- The header uses the same `BrandLogo` component and configured fallback as the production homepage. The static prototype passes no CMS media record; the approved logo asset can be connected at the single adapter in `prototype-logo.tsx` when supplied.
- The three industrial images were generated specifically for this prototype and do not depict a real OSI customer, employee, product, or documented site.
- The prototype does not exercise real CMS content density, localization, production media governance, or final legal copy.

## Verification

```bash
pnpm exec eslint 'app/(theme-prototype)' prototypes/osi-theme-showcase tests/e2e/theme-showcase.spec.ts --max-warnings=0
pnpm exec tsc --noEmit
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 pnpm exec playwright test tests/e2e/theme-showcase.spec.ts --project=chromium
pnpm build
```

The Playwright coverage checks all five pages at `390×844`, `768×1024`, and `1440×1000`, verifies no horizontal overflow, checks keyboard focus and skip navigation, runs WCAG A/AA automation, and captures the ten review screenshots.

## Remove cleanly

1. Delete `prototypes/osi-theme-showcase/`.
2. Delete `app/(theme-prototype)/`.
3. Delete `tests/e2e/theme-showcase.spec.ts`.
4. Remove the six prototype entries (`theme-showcase`, `forge`, `vector`, `horizon`, `fieldwork`, `signal`) from `SKIPPED_TOP_SEGMENTS` in `proxy.ts`.

No database, generated type, environment, package, or deployment rollback is required.
