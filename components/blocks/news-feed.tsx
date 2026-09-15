import Link from "next/link";
import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";
import { DuotoneImage } from "@/components/ui/duotone-image";
import { AnimatedGroup, AnimatedItem } from "@/components/ui/animated-group";
import { listNewsPosts } from "@/lib/data/news";
import type { Tables } from "@/lib/db/database.types";
import type { FieldSpec } from "@/lib/blocks/admin-fields";
import { newsHref } from "@/lib/routes";

const schema = blockCommonSchema.extend({
  title: z.string().default("OSI News"),
  kind: z.enum(["all", "news", "conference", "event"]).default("all"),
  limit: z.number().min(1).max(20).default(4),
});

type Data = z.infer<typeof schema>;

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
        {post.published_at ? new Date(post.published_at).toLocaleDateString() : post.kind}
      </p>
      <h3 className="mt-1 font-display text-card-label tracking-wide-display uppercase">
        {post.title}
      </h3>
    </Link>
  );
}

async function Render({ data }: { data: Data }) {
  const posts = await listNewsPosts(data.kind === "all" ? undefined : data.kind);
  const limited = posts.slice(0, data.limit);
  const [featured, ...rest] = limited;

  if (!featured) {
    return null;
  }

  return (
    <Section
      background={data.background}
      spacingTop={data.spacingTop}
      spacingBottom={data.spacingBottom}
      anchorId={data.anchorId}
      reveal={false}
    >
      <h2 className="mb-8 font-display text-section tracking-tightest-display uppercase">
        {data.title}
      </h2>
      <Link href={newsHref(featured.slug)} className="mb-8 block">
        <DuotoneImage
          src={featured.cover_image_url ?? undefined}
          alt={featured.cover_image_url ? featured.title : ""}
          className="aspect-[21/9] w-full"
          intensity={0.3}
        />
        <h3 className="mt-4 font-display text-card-label tracking-wide-display uppercase">
          {featured.title}
        </h3>
      </Link>
      {rest.length > 0 && (
        <AnimatedGroup className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {rest.map((post) => (
            <AnimatedItem key={post.id} className="h-full">
              <PostCard post={post} />
            </AnimatedItem>
          ))}
        </AnimatedGroup>
      )}
    </Section>
  );
}

const adminFields: FieldSpec[] = [
  { key: "title", label: "Title", type: "text" },
  { key: "kind", label: "Kind", type: "select", options: ["all", "news", "conference", "event"] },
  { key: "limit", label: "Max items", type: "number" },
];

export const newsFeedBlock = defineBlock({
  type: "news_feed",
  description: "Auto-pulls the latest published news/press posts (one featured + a grid) — no manual entry, so use it wherever the page should stay current with /news automatically.",
  label: "News feed",
  category: "content",
  schema,
  adminFields,
  defaults: { background: "cream", spacingTop: "md", spacingBottom: "md", title: "OSI News", kind: "all", limit: 4 },
  Render,
});
