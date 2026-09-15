import Link from "next/link";
import type { Metadata } from "next";
import { listNewsPosts } from "@/lib/data/news";
import { Section } from "@/components/ui/section";
import { DuotoneImage } from "@/components/ui/duotone-image";
import { AnimatedGroup, AnimatedItem } from "@/components/ui/animated-group";
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
      className="block h-full transition-shadow duration-300 hover:shadow-[0_0_0_1px_var(--color-osi-steel-500),0_8px_32px_color-mix(in_srgb,var(--color-osi-steel-500)_25%,transparent),0_0_60px_color-mix(in_srgb,var(--color-osi-steel-500)_10%,transparent)]"
    >
      <DuotoneImage
        src={post.cover_image_url ?? undefined}
        alt={post.cover_image_url ? post.title : ""}
        className="aspect-video"
        intensity={0.2}
      />
      <p className="mt-3 text-xs text-osi-slate-400 uppercase">
        {post.published_at ? new Date(post.published_at).toLocaleDateString() : KIND_LABELS[post.kind]}
      </p>
      <h2 className="mt-1 font-display text-card-label tracking-wide-display uppercase">{post.title}</h2>
      {post.excerpt && <p className="mt-2 text-sm opacity-70">{post.excerpt}</p>}
    </Link>
  );
}

export default async function NewsListingPage() {
  const posts = await listNewsPosts();

  return (
    <Section background="cream" spacingTop="lg" spacingBottom="lg">
      <h1 className="mb-10 font-display text-section tracking-tightest-display uppercase">News</h1>

      {posts.length > 0 ? (
        <AnimatedGroup className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <AnimatedItem key={post.id} className="h-full">
              <PostCard post={post} />
            </AnimatedItem>
          ))}
        </AnimatedGroup>
      ) : (
        <p className="text-sm text-osi-slate-400">
          Nothing published yet — check back soon for company news, conferences, and events.
        </p>
      )}
    </Section>
  );
}
