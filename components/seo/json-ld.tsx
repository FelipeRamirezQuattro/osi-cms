// Renders one JSON-LD <script> tag. `data` is always our own
// server-constructed object (never raw user input), so
// dangerouslySetInnerHTML here is safe — see each call site.
export function JsonLd({ data }: { data: object }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}

export function organizationJsonLd(input: {
  url: string;
  phone?: string | null;
  socialLinks: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Odessa Separator Inc.",
    url: input.url,
    ...(input.phone ? { telephone: input.phone } : {}),
    ...(input.socialLinks.length > 0 ? { sameAs: input.socialLinks } : {}),
  };
}

export function productJsonLd(input: {
  name: string;
  description?: string | null;
  url: string;
  image?: string;
  brand?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    url: input.url,
    ...(input.image ? { image: input.image } : {}),
    brand: { "@type": "Brand", name: input.brand ?? "Odessa Separator Inc." },
  };
}

export function articleJsonLd(input: {
  headline: string;
  url: string;
  description?: string | null;
  image?: string;
  datePublished?: string | null;
  /** Blog posts name a person; omitted = the organization. */
  authorName?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.headline,
    url: input.url,
    ...(input.description ? { description: input.description } : {}),
    ...(input.image ? { image: input.image } : {}),
    ...(input.datePublished ? { datePublished: input.datePublished } : {}),
    author: input.authorName
      ? { "@type": "Person", name: input.authorName }
      : { "@type": "Organization", name: "Odessa Separator Inc." },
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
