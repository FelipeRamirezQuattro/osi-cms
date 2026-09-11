# Odessa Separator Inc. — website rebuild

Next.js (App Router) + Supabase rebuild of odessaseparator.com, with a
block-based CMS admin. See [`CLAUDE.md`](./CLAUDE.md) for conventions,
constraints, and phase plan.

## Development

```bash
pnpm install
pnpm dev
```

Copy `.env.example` to `.env.local` and fill in Supabase credentials.

## Content and design source of truth

- `content/legacy/` — scraped legacy site content (19 pages), the input
  to the Phase 4 migration script. Do not hand-edit; re-scrape upstream
  instead.
- `docs/design/` — the design mockup PDF the visual design must trace
  back to.
