// Re-exports app/(site)/not-found.tsx's exact content — see this route
// group's layout.tsx for why it exists at all. Kept as a re-export
// rather than a copy so the two 404 experiences (this genuine-status one
// and (site)'s own soft-but-chrome'd one, still used for client-side
// navigation to a broken link — see proxy.ts's top comment) can never
// drift out of sync with each other.
export { metadata, NotFound as default } from "@/app/(site)/not-found";
