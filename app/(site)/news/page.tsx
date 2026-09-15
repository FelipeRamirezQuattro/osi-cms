import Link from "next/link";
import type { Metadata } from "next";
import { listNewsPosts } from "@/lib/data/news";
import { Section } from "@/components/ui/section";
import { DuotoneImage } from "@/components/ui/duotone-image";
import { ArrowButton } from "@/components/ui/arrow-button";
import { EmptyState, Eyebrow } from "@/components/ui/public-primitives";
import { newsHref } from "@/lib/routes";
import type { Tables } from "@/lib/db/database.types";

export const metadata: Metadata = {
  title: "News",
  description: "Company news, conferences, and events from Odessa Separator Inc.",
};

const KIND_LABELS: Record<string, string> = { news: "News", conference: "Conference", event: "Event" };

function PostCard({ post }: { post: Tables<"news_posts"> }) {
  return (
    <Link
      href={newsHref(post.slug)}
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
          OSI update
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold tracking-[0.08em] text-osi-gold-700 uppercase">
          {post.published_at
            ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(post.published_at))
            : KIND_LABELS[post.kind]}
        </p>
        <h2 className="mt-1 font-editorial text-xl font-semibold leading-tight text-balance">{post.title}</h2>
        {post.excerpt && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-osi-slate-300">{post.excerpt}</p>}
        <span className="mt-auto inline-flex min-h-11 items-center gap-2 pt-5 text-sm font-semibold">
          Read more <span aria-hidden className="text-osi-gold-700 transition-transform duration-200 group-hover:translate-x-1">→</span>
        </span>
      </div>
    </Link>
  );
}

export default async function NewsListingPage() {
  const posts = await listNewsPosts();

  return (
    <Section background="cream" spacingTop="lg" spacingBottom="lg">
      <Eyebrow className="mb-3">From OSI</Eyebrow>
      <h1 className="mb-10 font-editorial text-[clamp(2.25rem,6vw,4.5rem)] font-semibold leading-none text-balance">News and field updates</h1>

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
          title="No updates are published yet"
          description="Company news, conferences, and events will appear here once they are ready. Explore OSI products in the meantime."
          action={<ArrowButton href="/products" variant="outline-dark">Explore products</ArrowButton>}
        />
      )}
    </Section>
  );
}
