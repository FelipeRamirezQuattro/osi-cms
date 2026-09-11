"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createPageAction } from "@/lib/actions/pages";

const TEMPLATES = ["standard", "landing", "legal", "product", "contact"] as const;

export function NewPageForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [template, setTemplate] = useState<(typeof TEMPLATES)[number]>("standard");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createPageAction({
        title,
        slug,
        locale: "en",
        template,
        seo_title: null,
        seo_description: null,
        og_image_url: null,
        noindex: false,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.push(`/admin/pages/${result.id}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-4">
      <label className="block space-y-1 text-sm">
        <span className="block text-xs uppercase tracking-wide-label opacity-70">Title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full rounded border border-osi-sand-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="block text-xs uppercase tracking-wide-label opacity-70">Slug</span>
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
          placeholder="e.g. about-us or services/machine-shop"
          className="w-full rounded border border-osi-sand-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="block text-xs uppercase tracking-wide-label opacity-70">Template</span>
        <select
          value={template}
          onChange={(e) => setTemplate(e.target.value as (typeof TEMPLATES)[number])}
          className="w-full rounded border border-osi-sand-300 px-3 py-2 text-sm"
        >
          {TEMPLATES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-osi-navy-900 px-4 py-2 text-xs uppercase tracking-wide-label text-osi-white disabled:opacity-50"
      >
        {isPending ? "Creating…" : "Create page"}
      </button>
    </form>
  );
}
