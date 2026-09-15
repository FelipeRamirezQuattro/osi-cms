"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createSharedSectionAction } from "@/lib/actions/shared-sections";
import { AsyncMessage } from "@/components/admin/ui/async-message";

export function NewSharedSectionForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [key, setKey] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createSharedSectionAction({ title, key });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.push(`/admin/shared-sections/${result.id}`);
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
          autoComplete="off"
          className="w-full rounded border border-osi-sand-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="block text-xs uppercase tracking-wide-label opacity-70">Key</span>
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          required
          placeholder="e.g. footer-cta"
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded border border-osi-sand-300 px-3 py-2 text-sm"
        />
        <span className="block text-xs opacity-60">
          What the &quot;Shared section&quot; block on any page references — can&apos;t be changed later.
        </span>
      </label>
      <AsyncMessage message={error ? { kind: "error", text: error } : null} />
      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-osi-navy-900 px-4 py-2 text-xs uppercase tracking-wide-label text-osi-white disabled:opacity-50"
      >
        {isPending ? "Creating…" : "Create shared section"}
      </button>
    </form>
  );
}
