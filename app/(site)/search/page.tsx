import Link from "next/link";
import type { Metadata } from "next";
import { Section } from "@/components/ui/section";
import { ArrowButton } from "@/components/ui/arrow-button";
import { EmptyState, Eyebrow } from "@/components/ui/public-primitives";
import { searchSite } from "@/lib/data/search";

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false },
};

const TYPE_LABELS: Record<string, string> = {
  page: "Page",
  product: "Product",
  news: "News",
  industry: "Industry",
  application: "Application",
  resource: "Resource",
};

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const results = q ? await searchSite(q) : [];

  return (
    <Section
      background="cream"
      spacingTop="lg"
      spacingBottom="lg"
      contentClassName="mx-auto max-w-4xl px-5 md:px-10"
    >
      <Eyebrow className="mb-3">Site search</Eyebrow>
      <h1 className="font-editorial text-[clamp(2.25rem,6vw,4.5rem)] font-semibold leading-none text-balance">
        Find products, resources, and expertise
      </h1>

      <form
        action="/search"
        method="get"
        className="my-10 rounded-[var(--site-radius-lg)] border border-[var(--site-border)] bg-white/45 p-4 md:p-6"
      >
        <label htmlFor="site-search-input" className="mb-2 block text-sm font-semibold">
          Search OSI
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="site-search-input"
            type="search"
            name="q"
            inputMode="search"
            autoComplete="off"
            defaultValue={q}
            placeholder="Try a product name or topic"
            className="min-h-12 min-w-0 flex-1 rounded-full border border-osi-navy-900/18 bg-white px-5 text-base outline-none transition-[border-color,box-shadow] duration-200 focus:border-osi-steel-500 focus:shadow-[0_0_0_3px_rgba(35,78,123,0.12)]"
          />
          <button
            type="submit"
            className="min-h-12 rounded-full bg-osi-gold-500 px-7 text-sm font-semibold text-osi-navy-900 transition-[background-color,transform] duration-200 hover:bg-osi-gold-400 active:scale-[0.98]"
          >
            Search
          </button>
        </div>
      </form>

      {q && (
        <p role="status" className="mb-6 text-sm font-medium text-osi-slate-300">
          {results.length} result{results.length === 1 ? "" : "s"} for &ldquo;{q}&rdquo;
        </p>
      )}

      {results.length > 0 && (
        <ul className="space-y-3">
          {results.map((result) => (
            <li key={`${result.type}-${result.href}`}>
              <Link
                href={result.href}
                className="group block rounded-[var(--site-radius-md)] border border-[var(--site-border)] bg-[var(--site-surface-raised)] p-5 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-osi-steel-500/35 hover:shadow-[0_12px_30px_rgba(0,27,51,0.08)]"
              >
                <span className="text-xs font-semibold tracking-[0.1em] text-osi-gold-700 uppercase">
                  {TYPE_LABELS[result.type]}
                </span>
                <h2 className="mt-1 font-editorial text-xl font-semibold leading-tight text-balance group-hover:underline group-hover:decoration-osi-gold-700 group-hover:underline-offset-4">
                  {result.title}
                </h2>
                {result.excerpt && (
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-osi-slate-300">
                    {result.excerpt}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {q && results.length === 0 && (
        <EmptyState
          title="No results found"
          description={`We couldn’t find anything for “${q}”. Check the spelling, try a broader phrase, or explore the product catalog.`}
          action={
            <ArrowButton href="/products" variant="outline-dark">
              Explore products
            </ArrowButton>
          }
        />
      )}
      {!q && (
        <EmptyState
          title="Start with a product or topic"
          description="Search across published OSI pages, products, news, applications, industries, and resources."
        />
      )}
    </Section>
  );
}
