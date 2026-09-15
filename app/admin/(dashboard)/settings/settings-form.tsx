"use client";

import { useState, useTransition } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { FieldRenderer } from "@/components/admin/field-renderer";
import { saveSettingsAction } from "@/lib/actions/settings";
import type { FieldSpec } from "@/lib/blocks/admin-fields";
import type { Tables } from "@/lib/db/database.types";
import { FormCard, SubmitButton } from "@/components/admin/ui/form-card";
import { AsyncMessage, type AsyncMessageState } from "@/components/admin/ui/async-message";

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
  {
    key: "announcement_bar",
    label: "Announcement bar",
    type: "object",
    fields: [
      { key: "enabled", label: "Show announcement bar", type: "boolean" },
      { key: "message", label: "Message", type: "text", optional: true },
      { key: "link_url", label: "Link URL (optional)", type: "text", optional: true },
      { key: "link_label", label: "Link label (optional)", type: "text", optional: true },
    ],
  },
];

const EMPTY_ANNOUNCEMENT_BAR = { enabled: false, message: "", link_url: "", link_label: "" };

export function SettingsForm({ settings }: { settings: Tables<"site_settings"> }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<AsyncMessageState>(null);

  // announcement_bar is a nullable jsonb column — a row that predates
  // this field (or was never touched) has it as `null`, which
  // react-hook-form can't register nested "announcement_bar.enabled"-style
  // paths against.
  const form = useForm<any>({
    defaultValues: {
      ...settings,
      announcement_bar: (settings.announcement_bar as Record<string, unknown> | null) ?? EMPTY_ANNOUNCEMENT_BAR,
    },
  });

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
      <FormCard title="Settings" maxWidth="max-w-xl" onSubmit={form.handleSubmit(onSubmit)}>
        {SETTINGS_FIELDS.map((field) => (
          <FieldRenderer key={field.key} spec={field} name={field.key} />
        ))}
        <AsyncMessage message={message} />
        <SubmitButton pending={isPending} />
      </FormCard>
    </FormProvider>
  );
}
