import Link from "next/link";
import type { Metadata } from "next";
import { Section } from "@/components/ui/section";
import { searchSite } from "@/lib/data/search";

export const metadata: Metadata = {
  title: "Search | Odessa Separator Inc.",
  robots: { index: false },
};

const TYPE_LABELS: Record<string, string> = {
  page: "Page",
  product: "Product",
};

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const results = q ? await searchSite(q) : [];

  return (
    <Section background="cream" spacingTop="lg" spacingBottom="lg" contentClassName="mx-auto max-w-3xl px-6 md:px-12">
      <h1 className="mb-6 font-display text-section tracking-tightest-display uppercase">Search</h1>

      <form action="/search" method="get" className="mb-10">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="What are you looking for?"
          className="w-full border-b border-current bg-transparent pb-2 text-lg placeholder:opacity-50 focus:outline-none"
        />
      </form>

      {q && (
        <p className="mb-6 text-sm text-osi-slate-400">
          {results.length} result{results.length === 1 ? "" : "s"} for &ldquo;{q}&rdquo;
        </p>
      )}

      <ul className="divide-y divide-osi-sand-300/40">
        {results.map((result) => (
          <li key={`${result.type}-${result.href}`} className="py-4">
            <Link href={result.href} className="group block">
              <span className="text-xs uppercase tracking-wide-label text-osi-gold-700">
                {TYPE_LABELS[result.type]}
              </span>
              <h2 className="font-display text-card-label tracking-wide-display uppercase group-hover:underline">
                {result.title}
              </h2>
              {result.excerpt && <p className="mt-1 text-sm opacity-70">{result.excerpt}</p>}
            </Link>
          </li>
        ))}
      </ul>

      {q && results.length === 0 && <p className="text-sm text-osi-slate-400">No results found.</p>}
    </Section>
  );
}
