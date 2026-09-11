# Decisions

One line per non-obvious choice, with the reason. Newest at bottom.

- **Scaffolded on Next.js 16.3.4, not 15.x.** The master prompt asked for
  "15+"; 16 is current stable and satisfies that. Recorded the Next 16
  breaking changes that affect this project in `CLAUDE.md` (`proxy.ts`
  instead of `middleware.ts`, always-async request APIs, `revalidateTag`
  two-arg signature, `cacheComponents` left off).
- **`content/legacy/` in the repo was initially the wrong dataset**
  (Quattro's own agency content, copied by mistake) — replaced with the
  correct Odessa Separator scrape from
  `~/Documents/Work/Quattro/webscrapper/scrape_output_odessaseparator/`
  before Phase 0 work began. Confirmed by URL/title match against the
  master prompt's page list.
- **SG-SST Policies legacy page stays in Spanish** when migrated — it's
  Colombian workplace-safety/harassment regulatory content, not
  translatable UI copy, so the English-only constraint doesn't apply to
  it. Revisit if the client wants an English translation alongside.
- **Supabase project `osi-cms` created fresh** (region `us-east-1`, org
  "Freelancer", free tier) rather than reusing an existing project in the
  account — none of the existing projects (`website`, `Quattro website`,
  `quiz`, `clamp-tracker`) belong to this client.
- **Prettier added alongside ESLint** in Phase 0 (`prettier`,
  `eslint-config-prettier`, `prettier-plugin-tailwindcss`) since the
  master prompt's stack table calls for "ESLint/Prettier" explicitly.
