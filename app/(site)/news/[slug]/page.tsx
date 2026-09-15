import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getNewsPostBySlug } from "@/lib/data/news";
import { getSiteSettings } from "@/lib/data/settings";
import { Section } from "@/components/ui/section";
import { DuotoneImage } from "@/components/ui/duotone-image";
import { ArrowButton } from "@/components/ui/arrow-button";
import { RichTextRender, type RichTextData } from "@/components/blocks/rich-text";
import { JsonLd, articleJsonLd, breadcrumbJsonLd } from "@/components/seo/json-ld";
import { absoluteUrl, resolveOgImage } from "@/lib/seo";
import { newsHref } from "@/lib/routes";

const KIND_LABELS: Record<string, string> = { news: "News", conference: "Conference", event: "Event" };

// news_posts.body is a Tiptap jsonb doc, same shape rich_text blocks
// store — an empty doc (never written) is treated the same as null, same
// reasoning as the product detail page's hasRichTextContent check.
function hasRichTextContent(value: unknown): value is { type: "doc"; content: unknown[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    "content" in value &&
    Array.isArray((value as { content: unknown }).content) &&
    (value as { content: unknown[] }).content.length > 0
  );
}

export async function generateMetadata({
  params,
}: PageProps<"/news/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [post, settings] = await Promise.all([getNewsPostBySlug(slug), getSiteSettings()]);
  if (!post) return {};
  const ogImage = resolveOgImage(post.cover_image_url, settings.default_og_image);
  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    openGraph: ogImage ? { images: [ogImage] } : undefined,
  };
}

export default async function NewsDetailPage({ params }: PageProps<"/news/[slug]">) {
  const { slug } = await params;
  const post = await getNewsPostBySlug(slug);
  if (!post) notFound();

  const postUrl = absoluteUrl(newsHref(post.slug));
  const image = post.cover_image_url ? resolveOgImage(post.cover_image_url, null) : undefined;

  return (
    <>
      <JsonLd
        data={articleJsonLd({
          headline: post.title,
          url: postUrl,
          description: post.excerpt,
          image,
          datePublished: post.published_at,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: absoluteUrl("/") },
          { name: "News", url: absoluteUrl(newsHref()) },
          { name: post.title, url: postUrl },
        ])}
      />
      <Section background="navy" spacingTop="lg" spacingBottom="md" reveal={false}>
        <p className="mb-4 text-xs font-semibold tracking-[0.1em] text-osi-gold-400 uppercase">
          {post.published_at
            ? new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(new Date(post.published_at))
            : KIND_LABELS[post.kind]}
        </p>
        <h1 className="max-w-4xl font-editorial text-[clamp(2.25rem,6vw,4.5rem)] font-semibold leading-[1.05] text-balance [overflow-wrap:anywhere]">{post.title}</h1>
        {post.excerpt && <p className="mt-5 max-w-[65ch] text-base leading-relaxed text-osi-slate-200">{post.excerpt}</p>}
        {post.kind !== "news" && (post.event_date || post.event_location) && (
          <p className="mt-6 text-sm text-osi-slate-200">
            {post.event_date && new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(new Date(post.event_date))}
            {post.event_date && post.event_location ? " — " : ""}
            {post.event_location}
          </p>
        )}
      </Section>

      {post.cover_image_url && (
        <Section background="cream" spacingTop="md" spacingBottom="sm">
          <DuotoneImage
            src={post.cover_image_url}
            alt={post.title}
            className="aspect-[21/9] w-full"
            intensity={0.2}
            sizes="(min-width: 1280px) 72rem, 100vw"
          />
        </Section>
      )}

      {hasRichTextContent(post.body) && (
        <RichTextRender
          data={{
            background: "cream",
            spacingTop: post.cover_image_url ? "sm" : "md",
            spacingBottom: "md",
            content: post.body as RichTextData["content"],
          }}
        />
      )}

      {post.cta_label && post.cta_url && (
        <Section background="cream" spacingTop="sm" spacingBottom="lg">
          <ArrowButton href={post.cta_url} variant="outline-dark">
            {post.cta_label}
          </ArrowButton>
        </Section>
      )}
    </>
  );
}
