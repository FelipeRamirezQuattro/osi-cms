"use client";

import { useState, useTransition } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { FieldRenderer } from "@/components/admin/field-renderer";
import { saveSettingsAction } from "@/lib/actions/settings";
import type { FieldSpec } from "@/lib/blocks/admin-fields";
import type { Tables } from "@/lib/db/database.types";

// Same reasoning as the other admin forms — one flat, loosely-typed object.
/* eslint-disable @typescript-eslint/no-explicit-any */

const SETTINGS_FIELDS: FieldSpec[] = [
  { key: "phone", label: "Phone", type: "text", optional: true },
  { key: "email", label: "Email", type: "text", optional: true },
  { key: "address_lines", label: "Address lines", type: "array" },
  { key: "map_embed_url", label: "Map embed URL", type: "text", optional: true },
  { key: "social_facebook", label: "Facebook URL", type: "text", optional: true },
  { key: "social_linkedin", label: "LinkedIn URL", type: "text", optional: true },
  { key: "social_youtube", label: "YouTube URL", type: "text", optional: true },
  { key: "social_instagram", label: "Instagram URL", type: "text", optional: true },
  { key: "footer_tagline", label: "Footer tagline", type: "text", optional: true },
  { key: "default_og_image", label: "Default social image", type: "image", optional: true },
];

export function SettingsForm({ settings }: { settings: Tables<"site_settings"> }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const form = useForm<any>({ defaultValues: settings });

  function onSubmit(values: any) {
    setMessage(null);
    startTransition(async () => {
      const result = await saveSettingsAction(values);
      setMessage(
        result.status === "success"
          ? { kind: "success", text: "Settings saved." }
          : { kind: "error", text: result.message },
      );
    });
  }

  return (
    <FormProvider {...form}>
      <div className="max-w-xl space-y-6">
        <h1 className="font-display text-lg tracking-wide-display uppercase">Settings</h1>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4 rounded border border-osi-sand-300 bg-osi-white p-5"
        >
          {SETTINGS_FIELDS.map((field) => (
            <FieldRenderer key={field.key} spec={field} name={field.key} />
          ))}
          {message && (
            <p className={message.kind === "error" ? "text-sm text-red-600" : "text-sm text-green-700"}>
              {message.text}
            </p>
          )}
          <button
            type="submit"
            disabled={isPending}
            className="rounded bg-osi-navy-900 px-4 py-2 text-xs uppercase tracking-wide-label text-osi-white disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
        </form>
      </div>
    </FormProvider>
  );
}
