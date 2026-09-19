import Link from "next/link";
import type { Metadata } from "next";
import { listBlogPosts } from "@/lib/data/news";
import { Section } from "@/components/ui/section";
import { DuotoneImage } from "@/components/ui/duotone-image";
import { ArrowButton } from "@/components/ui/arrow-button";
import { EmptyState, Eyebrow } from "@/components/ui/public-primitives";
import { blogHref } from "@/lib/routes";
import type { Tables } from "@/lib/db/database.types";

export const metadata: Metadata = {
  title: "Blog",
  description: "Articles and field insights from Odessa Separator Inc.",
};

function PostCard({ post }: { post: Tables<"news_posts"> }) {
  const meta = [
    post.published_at ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(post.published_at)) : null,
    post.reading_minutes ? `${post.reading_minutes} min read` : null,
  ].filter(Boolean);

  return (
    <Link
      href={blogHref(post.slug)}
      className="group flex h-full flex-col overflow-hidden rounded-[var(--site-radius-lg)] border border-[var(--site-border)] bg-[var(--site-surface-raised)] transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-osi-steel-500/35 hover:shadow-[0_18px_45px_rgba(0,27,51,0.12)]"
    >
      {post.cover_image_url ? (
        <DuotoneImage
          src={post.cover_image_url}
          alt=""
          className="aspect-video"
          intensity={0.2}
          sizes="(min-width: 1024px) 24rem, (min-width: 640px) 50vw, 100vw"
        />
      ) : (
        <div className="flex aspect-video items-end bg-osi-navy-900 p-5 text-xs font-semibold tracking-[0.1em] text-osi-gold-400 uppercase">
          OSI blog
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        {meta.length > 0 && (
          <p className="text-xs font-semibold tracking-[0.08em] text-osi-gold-700 uppercase">{meta.join(" · ")}</p>
        )}
        <h2 className="mt-1 font-editorial text-xl font-semibold leading-tight text-balance">{post.title}</h2>
        {post.excerpt && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-osi-slate-300">{post.excerpt}</p>}
        <span className="mt-auto inline-flex min-h-11 items-center gap-2 pt-5 text-sm font-semibold">
          Read article <span aria-hidden className="text-osi-gold-700 transition-transform duration-200 group-hover:translate-x-1">→</span>
        </span>
      </div>
    </Link>
  );
}

export default async function BlogListingPage({ searchParams }: PageProps<"/blog">) {
  const { tag } = await searchParams;
  const activeTag = typeof tag === "string" && tag.trim() ? tag.trim() : undefined;
  // The tag list comes from every published post, not the filtered set, so
  // the filter links don't disappear once one is selected.
  const allPosts = await listBlogPosts();
  const posts = activeTag ? allPosts.filter((post) => post.tags.includes(activeTag)) : allPosts;
  const tags = [...new Set(allPosts.flatMap((post) => post.tags))].sort((a, b) => a.localeCompare(b));

  return (
    <Section background="cream" spacingTop="lg" spacingBottom="lg">
      <Eyebrow className="mb-3">From OSI</Eyebrow>
      <h1 className="mb-6 font-editorial text-[clamp(2.25rem,6vw,4.5rem)] font-semibold leading-none text-balance">Blog</h1>

      {tags.length > 0 && (
        <nav aria-label="Filter by tag" className="mb-10 flex flex-wrap gap-2">
          <Link
            href={blogHref()}
            aria-current={activeTag ? undefined : "page"}
            className="inline-flex min-h-11 items-center rounded-full border border-[var(--site-border)] px-4 text-sm font-semibold aria-[current=page]:bg-osi-navy-900 aria-[current=page]:text-white"
          >
            All
          </Link>
          {tags.map((name) => (
            <Link
              key={name}
              href={`${blogHref()}?tag=${encodeURIComponent(name)}`}
              aria-current={activeTag === name ? "page" : undefined}
              className="inline-flex min-h-11 items-center rounded-full border border-[var(--site-border)] px-4 text-sm font-semibold aria-[current=page]:bg-osi-navy-900 aria-[current=page]:text-white"
            >
              {name}
            </Link>
          ))}
        </nav>
      )}

      {posts.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <div key={post.id} className="h-full">
              <PostCard post={post} />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title={activeTag ? `No articles tagged "${activeTag}"` : "No articles are published yet"}
          description="Articles and field insights will appear here once they are ready. Explore OSI products in the meantime."
          action={<ArrowButton href="/products" variant="outline-dark">Explore products</ArrowButton>}
        />
      )}
    </Section>
  );
}
