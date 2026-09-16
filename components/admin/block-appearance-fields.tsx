"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import type { BrandingConfig, BlockTypeKey } from "@/lib/branding/schema";
import type { BlockAppearance } from "@/lib/blocks/common";
import type { BlockAppearanceCapabilities } from "@/lib/blocks/types";
import { FONT_CATALOG, type FontCatalogKey, type TypographySlot } from "@/lib/fonts/catalog";
import { Select } from "@/components/admin/ui/select";
import { FormField } from "@/components/admin/ui/form-field";

const BrandingOptionsContext = createContext<BrandingConfig | null>(null);

export function PublishedBrandingOptionsProvider({ branding, children }: { branding: BrandingConfig; children: ReactNode }) {
  return <BrandingOptionsContext.Provider value={branding}>{children}</BrandingOptionsContext.Provider>;
}

const LEGACY_SURFACES: Record<string, string> = {
  navy: "primary-dark",
  cream: "reading-light",
  transparent: "transparent-inherit",
};

const SLOT_LABELS: Record<TypographySlot, string> = {
  display: "Display font", heading: "Heading font", body: "Body font", label: "Interface / label font",
};

export function BlockAppearanceFields({
  blockType,
  capabilities,
  namePrefix,
}: {
  blockType: string;
  capabilities: BlockAppearanceCapabilities;
  namePrefix: string;
}) {
  const branding = useContext(BrandingOptionsContext);
  const { control, setValue } = useFormContext();
  const appearance = useWatch({ control, name: `${namePrefix}.appearance` }) as BlockAppearance | undefined;
  const legacyBackground = useWatch({ control, name: `${namePrefix}.background` }) as string | undefined;
  if (!branding) return null;

  const blockDefaults = branding.blockDefaults[blockType as BlockTypeKey];

  /** Per-control inheritance label: what this ONE field is actually doing, not the fieldset as a whole. */
  function fieldSource(value: string | null | undefined, blockDefaultValue: string | null | undefined): string {
    if (appearance === undefined) return `Legacy: ${legacyBackground ?? "cream"}`;
    if (value) return "Custom for this block";
    return blockDefaultValue ? `Block default · ${blockDefaultValue}` : "Site default";
  }

  function write(next: BlockAppearance) {
    setValue(`${namePrefix}.appearance`, next, { shouldDirty: true, shouldTouch: true });
  }

  function editableAppearance(): BlockAppearance {
    if (appearance) return { ...appearance, typography: { ...(appearance.typography ?? {}) } };
    return {
      surfacePresetId: LEGACY_SURFACES[legacyBackground ?? "cream"] ?? "reading-light",
      typography: {},
    };
  }

  return (
    <fieldset className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-muted)] p-4">
      <legend className="px-1 text-sm font-semibold">Appearance</legend>
      <p className="mb-4 text-xs text-[var(--admin-ink-secondary)]">
        Choose an approved override per field, or leave it inherited — each field below shows where its current value comes from.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {capabilities.surface && (
          <FormField label="Surface" help={fieldSource(appearance?.surfacePresetId, blockDefaults?.surfacePresetId)}>
            <Select
              value={appearance === undefined ? "__legacy" : (appearance.surfacePresetId ?? "")}
              onChange={(event) => {
                if (event.target.value === "__legacy") {
                  setValue(`${namePrefix}.appearance`, undefined, { shouldDirty: true });
                  return;
                }
                const next = editableAppearance();
                if (event.target.value) next.surfacePresetId = event.target.value;
                else delete next.surfacePresetId;
                write(next);
              }}
            >
              <option value="__legacy">Legacy: {legacyBackground ?? "cream"}</option>
              <option value="">Use block default{blockDefaults?.surfacePresetId ? ` · ${blockDefaults.surfacePresetId}` : ""}</option>
              {branding.surfacePresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
            </Select>
          </FormField>
        )}
        {capabilities.accent && (
          <FormField label="Accent" help={fieldSource(appearance?.accentSwatchId, blockDefaults?.accentSwatchId)}>
            <Select value={appearance?.accentSwatchId ?? ""} onChange={(event) => { const next = editableAppearance(); if (event.target.value) next.accentSwatchId = event.target.value; else delete next.accentSwatchId; write(next); }}>
              <option value="">Use block default{blockDefaults?.accentSwatchId ? ` · ${blockDefaults.accentSwatchId}` : ""}</option>
              {branding.swatches.filter((swatch) => swatch.category === "brand").map((swatch) => <option key={swatch.id} value={swatch.id}>{swatch.name} · {swatch.hex}</option>)}
            </Select>
          </FormField>
        )}
        {capabilities.typography.map((slot) => (
          <FormField key={slot} label={SLOT_LABELS[slot]} help={fieldSource(appearance?.typography?.[slot], blockDefaults?.typography[slot])}>
            <Select value={appearance?.typography?.[slot] ?? ""} onChange={(event) => { const next = editableAppearance(); next.typography ??= {}; if (event.target.value) next.typography[slot] = event.target.value as FontCatalogKey; else delete next.typography[slot]; write(next); }}>
              <option value="">Use block default{blockDefaults?.typography[slot] ? ` · ${blockDefaults.typography[slot]}` : ""}</option>
              {FONT_CATALOG.filter((font) => font.status === "available" && (font.allowedRoles as readonly string[]).includes(slot)).map((font) => <option key={font.key} value={font.key}>{font.family}</option>)}
            </Select>
          </FormField>
        ))}
      </div>
      {appearance !== undefined && (
        <button type="button" onClick={() => write({})} className="mt-4 text-xs font-medium text-[var(--admin-primary)] hover:underline">
          Reset all to block defaults
        </button>
      )}
    </fieldset>
  );
}
