# Branding Phase 2 — font catalog and server theme compiler

Date: 2026-09-15  
Plan: `docs/superpowers/plans/2026-09-15-branding-module-and-block-theming.md`

## Phase 0–1 takeover verification

The takeover review was intentionally bounded to the contracts Phase 2 depends on.

- Phase 0's inventory matches the current public tokens, four typography roles, 34 registered block keys, OSI fallback configuration, and nine-entry catalog decision. The corrected admin-isolation note accurately describes the scoped compatibility bridge.
- Phase 1's data repository reads public branding only from `site_branding_publications`; draft/history access and every mutation remain gated by `manage_settings` in both actions and RLS/RPCs.
- Draft save and publish validate the complete versioned Zod contract. Publish revalidates the current stored draft before the atomic RPC.
- The OSI seed parses cleanly and the warning color correction clears the schema's contrast rules.
- Existing Phase 0–1 tests passed unchanged. The already-ledgered revision-version uniqueness improvement remains a non-blocking final-review item.
- The seven Google-hosted catalog families were rechecked against their current `OFL.txt` files in the official `google/fonts` repository; all declare SIL Open Font License 1.1.

No Phase 0–1 remediation was required before Phase 2.

## Phase 2 implementation

### Code-owned font registry

- Moved the catalog out of the branding schema into `lib/fonts/catalog.ts` while preserving the schema's compatibility re-exports.
- Recorded stable key, family, fallback, source/license note, weights, styles, subsets, allowed roles, loading strategy, sample text, status, and code-owned CSS variable for all nine entries.
- Added self-hosted `next/font` declarations for Orbitron, Montserrat, Poppins, Rajdhani, Fraunces, Source Sans 3, and Inter.
- System Sans and System Serif require no font asset.
- Web-font preload is disabled because the published selection is request-time data. All catalog declarations can exist in the public route CSS, but the browser requests only the families and weights referenced by the compiled published roles.

### Safe compiler and fallback

- `compileBrandingTheme()` accepts untrusted input, validates it against the versioned branding schema, and falls back atomically to `OSI_SEED_BRANDING_CONFIG` on any error.
- Output is a deterministic, sorted React style object containing CSS custom properties; no `dangerouslySetInnerHTML` or raw stylesheet interpolation is used.
- Editable names and notes are never emitted into CSS. Hex colors, IDs, references, and font keys must pass the existing strict schema before compilation.
- Semantic color, swatch, surface, typography, and compatibility variables are emitted. The compatibility aliases preserve the current OSI appearance until Phase 3 replaces direct OSI utility decisions.

### Server resolution and route isolation

- `resolvePublishedBranding()` is marked `server-only` and reads only the public publication repository.
- Missing rows, failed reads, or malformed stored configuration resolve to the code-owned OSI fallback.
- `PublicThemeBoundary` places the compiled variables and selected font-variable classes in the initial server HTML.
- The public site layout fetches settings and branding concurrently.
- The root layout no longer imports public fonts or applies public color/font utilities. Admin routes therefore receive neither public theme variables nor public font requests.
- `/styleguide` uses the same published boundary; authenticated `/preview/...` already inherits the public site layout.

## Verification

- `pnpm check`: 77 test files / 637 tests passed, including lint and TypeScript.
- Existing Phase 0–1 focused suite: 50/50 tests passed.
- New Phase 2 unit suite: catalog metadata/stacks, deterministic compilation, OSI seed fidelity, malformed configuration, unknown font fallback, CSS-injection rejection, publication resolution, missing publication, and failed read fallback.
- New browser suite: 4/4 checks passed across desktop and mobile for initial-HTML variables and admin isolation.
- Production build passed with Next.js 16.3.4.
- Production-browser inspection:
  - public computed body font: Poppins;
  - public computed display font: Orbitron;
  - published theme variables present before hydration;
  - five font-file requests on the inspected home composition, all from selected OSI families/weights;
  - zero public font-file requests and no branding boundary on `/admin/login`.
- Home screenshot at 1440×900 differed from the Phase 0 public baseline by 2,630 pixels out of 1,296,000 (0.20%), consistent with dynamic/render timing and with no visible theme or typography regression.

## Files to start with

- `lib/fonts/catalog.ts`
- `lib/fonts/public-fonts.ts`
- `lib/branding/theme.ts`
- `lib/branding/resolve.ts`
- `components/branding/public-theme-boundary.tsx`
- `app/(site)/layout.tsx`
- `tests/e2e/branding-theme.spec.ts`

## Remaining plan work

Phase 3 should replace brand-configurable direct OSI color/font decisions with the semantic variables emitted here. Layout, motion, spacing, and intentionally fixed safety colors should remain unchanged.
