"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  publishBrandingAction,
  resetBrandingDraftToPublishedAction,
  restoreBrandingRevisionToDraftAction,
  saveBrandingDraftAction,
} from "@/lib/actions/branding";
import type { BrandingDraft, BrandingPublication, BrandingRevision } from "@/lib/data/branding";
import type { BlockTypeKey, BrandingConfig, SemanticRoles, TypographyRoleAssignments } from "@/lib/branding/schema";
import type { BlockPaletteEntry } from "@/lib/blocks/registry";
import { FONT_CATALOG, type FontCatalogKey, type TypographySlot } from "@/lib/fonts/catalog";
import type { MediaAsset } from "@/lib/actions/media";
import { MediaPicker } from "@/components/admin/media-picker";
import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { Button } from "@/components/admin/ui/button";
import { Card } from "@/components/admin/ui/card";
import { Input } from "@/components/admin/ui/input";
import { Select } from "@/components/admin/ui/select";
import { FormField } from "@/components/admin/ui/form-field";
import { AsyncMessage, type AsyncMessageState } from "@/components/admin/ui/async-message";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { useConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { useToast } from "@/components/admin/ui/toast";
import { BrandingPreviewFrame } from "@/components/admin/branding-preview-frame";

const ROLE_LABELS: Record<keyof SemanticRoles, string> = {
  primary: "Primary", secondary: "Secondary", accentOnDark: "Accent on dark", accentOnLight: "Accent on light",
  lightSurface: "Light surface", darkSurface: "Dark surface", textOnLight: "Text on light", textOnDark: "Text on dark",
  mutedTextOnLight: "Muted text on light", mutedTextOnDark: "Muted text on dark", borderOnLight: "Border on light",
  borderOnDark: "Border on dark", focusIndicator: "Focus indicator", error: "Error", success: "Success",
  warning: "Warning", info: "Information",
};

const SLOT_LABELS: Record<TypographySlot, string> = {
  display: "Display", heading: "Heading", body: "Body", label: "Interface / label",
};

function copyConfig(config: BrandingConfig): BrandingConfig {
  return structuredClone(config);
}

function fontOptions(slot: TypographySlot) {
  return FONT_CATALOG.filter((font) => font.status === "available" && (font.allowedRoles as readonly string[]).includes(slot));
}

export function BrandingEditor({
  draft,
  published,
  revisions,
  palette,
  initialLogoAsset,
  publishedLogoUrl,
}: {
  draft: BrandingDraft;
  published: BrandingPublication | null;
  revisions: BrandingRevision[];
  palette: BlockPaletteEntry[];
  initialLogoAsset: MediaAsset | null;
  publishedLogoUrl: string | null;
}) {
  const router = useRouter();
  const pushToast = useToast();
  const { confirm, dialog } = useConfirmDialog();
  const [config, setConfig] = useState(() => copyConfig(draft.config));
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(draft.config));
  const [version, setVersion] = useState(draft.draft_version);
  const [logoAsset, setLogoAsset] = useState(initialLogoAsset);
  const [message, setMessage] = useState<AsyncMessageState>(null);
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();
  const isLive = published?.published_version === version;
  const isDirty = JSON.stringify(config) !== savedSnapshot;

  useEffect(() => {
    if (!isDirty) return;
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [isDirty]);

  const filteredPalette = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? palette.filter((block) => `${block.label} ${block.type}`.toLowerCase().includes(query)) : palette;
  }, [palette, search]);

  function update(mutator: (next: BrandingConfig) => void) {
    setConfig((current) => {
      const next = copyConfig(current);
      mutator(next);
      return next;
    });
    setMessage(null);
  }

  function handleResult(result: Awaited<ReturnType<typeof saveBrandingDraftAction>>, successText: string) {
    if (result.status === "error") {
      setMessage({ kind: "error", text: result.message });
      return false;
    }
    setVersion(result.newVersion);
    setMessage({ kind: "success", text: successText });
    pushToast({ title: successText, tone: "success" });
    return true;
  }

  function saveDraft() {
    startTransition(async () => {
      const result = await saveBrandingDraftAction(config, version);
      if (handleResult(result, "Branding draft saved.")) {
        setSavedSnapshot(JSON.stringify(config));
        router.refresh();
      }
    });
  }

  async function publish() {
    const ok = await confirm({
      title: "Publish branding?",
      message: "This updates the logo, colors, typography, and inherited block appearance across the public site.",
      consequences: ["Visitors will see the change immediately.", "A restorable revision will be created."],
      confirmLabel: "Publish branding",
    });
    if (!ok) return;
    startTransition(async () => {
      const saved = await saveBrandingDraftAction(config, version);
      if (saved.status === "error") {
        handleResult(saved, "");
        return;
      }
      setVersion(saved.newVersion);
      const result = await publishBrandingAction(saved.newVersion);
      if (handleResult(result, "Branding published.")) {
        setSavedSnapshot(JSON.stringify(config));
        router.refresh();
      }
    });
  }

  async function reset() {
    const ok = await confirm({
      title: "Discard draft changes?",
      message: "The draft will be replaced with the branding currently visible on the public site.",
      confirmLabel: "Reset draft",
      tone: "danger",
    });
    if (!ok) return;
    startTransition(async () => {
      const result = await resetBrandingDraftToPublishedAction(version);
      if (handleResult(result, "Draft reset to the live branding.")) {
        const restored = copyConfig(published?.config ?? config);
        setConfig(restored);
        setSavedSnapshot(JSON.stringify(restored));
        router.refresh();
      }
    });
  }

  async function restore(revision: BrandingRevision) {
    const ok = await confirm({
      title: `Restore revision ${revision.version}?`,
      message: "This replaces the current draft only. Review and publish it separately when ready.",
      confirmLabel: "Restore to draft",
    });
    if (!ok) return;
    startTransition(async () => {
      const result = await restoreBrandingRevisionToDraftAction(revision.id, version);
      if (handleResult(result, "Revision restored to draft.")) {
        const restored = copyConfig(revision.config);
        setConfig(restored);
        setSavedSnapshot(JSON.stringify(restored));
        router.refresh();
      }
    });
  }

  const swatchOptions = config.swatches.map((swatch) => ({ value: swatch.id, label: swatch.name, hex: swatch.hex }));

  return (
    <div className="space-y-6 pb-24">
      <AdminPageHeader
        title="Branding"
        subtitle={`Draft v${version} · ${published ? `Live v${published.published_version}` : "Not published"}`}
        description="Manage the public identity without changing the neutral admin interface. Save drafts freely, preview them, then publish when ready."
        actions={
          <>
            <StatusBadge label={isDirty ? "unsaved" : isLive ? "published" : "draft"} />
            <Button variant="ghost" onClick={reset} disabled={pending}>Reset</Button>
            <Button variant="secondary" onClick={saveDraft} disabled={pending}>{pending ? "Working…" : "Save draft"}</Button>
            <Button onClick={publish} disabled={pending}>{pending ? "Working…" : "Publish"}</Button>
          </>
        }
      />
      <AsyncMessage message={message} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Panel title="Primary logo" description="One logo is reused in the header, menu, and footer. The text wordmark remains as a safe fallback.">
            <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]">
              <div className="space-y-4">
                <MediaPicker
                  value={logoAsset?.url ?? ""}
                  label="logo"
                  accept="image"
                  onChange={(url) => {
                    if (!url) {
                      setLogoAsset(null);
                      update((next) => { next.logo.mediaAssetId = null; });
                    }
                  }}
                  onSelectAsset={(asset) => {
                    setLogoAsset(asset);
                    update((next) => { next.logo.mediaAssetId = asset.id; });
                  }}
                />
                {logoAsset && (
                  <p className="text-xs text-[var(--admin-ink-secondary)]">
                    {logoAsset.filename ?? logoAsset.title ?? "Selected asset"} · {logoAsset.width ?? "?"}×{logoAsset.height ?? "?"} · {logoAsset.mime ?? "image"}
                  </p>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
                <FormField label="Accessible brand name" htmlFor="brand-alt" help="Use the organization name, not the word “logo”.">
                  <Input id="brand-alt" value={config.logo.altText} onChange={(event) => update((next) => { next.logo.altText = event.target.value; })} />
                </FormField>
                <FormField label="Header size" htmlFor="brand-logo-size">
                  <Select id="brand-logo-size" value={config.logo.headerSizePreset} onChange={(event) => update((next) => { next.logo.headerSizePreset = event.target.value as typeof next.logo.headerSizePreset; })}>
                    <option value="sm">Small</option><option value="md">Medium</option><option value="lg">Large</option>
                  </Select>
                </FormField>
              </div>
            </div>
          </Panel>

          <Panel title="Brand colors" description="Edit approved swatches here. Components reference stable IDs, so renaming or recoloring stays consistent.">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {config.swatches.filter((swatch) => swatch.category === "brand").map((swatch) => {
                const realIndex = config.swatches.findIndex((item) => item.id === swatch.id);
                return (
                  <div key={swatch.id} className="rounded-lg border border-[var(--admin-border)] p-3">
                    <div className="mb-3 h-16 rounded-md border border-black/10" style={{ backgroundColor: swatch.hex }} />
                    <Input aria-label={`${swatch.name} name`} value={swatch.name} onChange={(event) => update((next) => { next.swatches[realIndex].name = event.target.value; })} />
                    <div className="mt-2 flex items-center gap-2">
                      <input aria-label={`${swatch.name} color`} type="color" value={swatch.hex} onChange={(event) => update((next) => { next.swatches[realIndex].hex = event.target.value.toUpperCase(); })} className="h-10 w-12 rounded border border-[var(--admin-border)] bg-transparent p-1" />
                      <code className="text-xs text-[var(--admin-ink-secondary)]">{swatch.hex}</code>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="Typography" description="Fonts are selected from a vetted, self-hosted catalog. Sizing and spacing remain controlled by the design system.">
            <div className="grid gap-4 sm:grid-cols-2">
              {(Object.keys(SLOT_LABELS) as TypographySlot[]).map((slot) => (
                <FormField key={slot} label={SLOT_LABELS[slot]} htmlFor={`font-${slot}`}>
                  <Select id={`font-${slot}`} value={config.typography[slot]} onChange={(event) => update((next) => { next.typography[slot] = event.target.value as TypographyRoleAssignments[typeof slot]; })}>
                    {fontOptions(slot).map((font) => <option key={font.key} value={font.key}>{font.family}</option>)}
                  </Select>
                </FormField>
              ))}
            </div>
          </Panel>

          <Panel title="Color roles and surfaces" description="Advanced mappings connect brand swatches to accessible, reusable interface roles.">
            <details>
              <summary className="cursor-pointer text-sm font-semibold">Edit semantic roles</summary>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(Object.keys(ROLE_LABELS) as Array<keyof SemanticRoles>).map((role) => (
                  <FormField key={role} label={ROLE_LABELS[role]} htmlFor={`role-${role}`}>
                    <SwatchSelect id={`role-${role}`} value={config.roles[role].swatchId} options={swatchOptions} disabled={role === "focusIndicator"} onChange={(value) => update((next) => { next.roles[role].swatchId = value; })} />
                  </FormField>
                ))}
              </div>
            </details>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {config.surfacePresets.map((preset, presetIndex) => (
                <details key={preset.id} className="rounded-lg border border-[var(--admin-border)] p-4">
                  <summary className="cursor-pointer text-sm font-semibold">{preset.name}</summary>
                  {preset.mode === "transparent" ? (
                    <p className="mt-2 text-xs text-[var(--admin-ink-secondary)]">Inherits the surrounding surface.</p>
                  ) : (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {(["backgroundSwatchId", "textSwatchId", "mutedTextSwatchId", "accentSwatchId", "borderSwatchId"] as const).map((field) => (
                        <FormField key={field} label={field.replace("SwatchId", "").replace(/([A-Z])/g, " $1")}>
                          <SwatchSelect value={preset[field] ?? ""} options={swatchOptions} onChange={(value) => update((next) => { next.surfacePresets[presetIndex][field] = value; })} />
                        </FormField>
                      ))}
                    </div>
                  )}
                </details>
              ))}
            </div>
          </Panel>

          <Panel title="Defaults by block" description="These values affect blocks that inherit. Existing legacy blocks keep their saved surface until an editor opts into inheritance.">
            <Input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search block types…" aria-label="Search block types" />
            <div className="mt-4 divide-y divide-[var(--admin-border)]">
              {filteredPalette.map((block) => {
                const blockType = block.type as BlockTypeKey;
                const defaults = config.blockDefaults[blockType];
                if (!defaults) return null;
                return (
                  <details key={block.type} className="py-3">
                    <summary className="cursor-pointer text-sm font-semibold">{block.label} <span className="font-normal text-[var(--admin-ink-secondary)]">· {block.type}</span></summary>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {block.appearance.surface && <FormField label="Surface"><Select value={defaults.surfacePresetId ?? ""} onChange={(event) => update((next) => { next.blockDefaults[blockType]!.surfacePresetId = event.target.value || null; })}><option value="">Site default</option>{config.surfacePresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}</Select></FormField>}
                      {block.appearance.accent && <FormField label="Accent"><SwatchSelect value={defaults.accentSwatchId ?? ""} options={swatchOptions} includeInherit onChange={(value) => update((next) => { next.blockDefaults[blockType]!.accentSwatchId = value || null; })} /></FormField>}
                      {block.appearance.typography.map((slot) => <FormField key={slot} label={`${SLOT_LABELS[slot]} font`}><Select value={defaults.typography[slot] ?? ""} onChange={(event) => update((next) => { const value = event.target.value; if (value) next.blockDefaults[blockType]!.typography[slot] = value as FontCatalogKey; else delete next.blockDefaults[blockType]!.typography[slot]; })}><option value="">Site default</option>{fontOptions(slot).map((font) => <option key={font.key} value={font.key}>{font.family}</option>)}</Select></FormField>)}
                    </div>
                  </details>
                );
              })}
            </div>
          </Panel>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <Card className="overflow-hidden p-0">
            <div className="border-b border-[var(--admin-border)] p-4"><h2 className="text-sm font-semibold">Draft preview</h2><p className="mt-1 text-xs text-[var(--admin-ink-secondary)]">A representative light and dark surface. Full viewport preview follows below.</p></div>
            <BrandSnapshot config={config} logoAsset={logoAsset} />
          </Card>
          <Card className="p-4">
            <h2 className="text-sm font-semibold">Revision history</h2>
            {revisions.length === 0 ? <p className="mt-2 text-xs text-[var(--admin-ink-secondary)]">No published revisions yet.</p> : <ul className="mt-3 space-y-2">{revisions.map((revision) => <li key={revision.id} className="flex items-center justify-between gap-3 text-xs"><span><strong>v{revision.version}</strong><br /><span className="text-[var(--admin-ink-secondary)]">{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(revision.created_at))}</span></span><Button variant="ghost" className="min-h-8 px-2 text-xs" onClick={() => restore(revision)} disabled={pending}>Restore</Button></li>)}</ul>}
          </Card>
        </aside>
      </div>
      <BrandingPreviewFrame
        draft={config}
        live={published?.config ?? config}
        draftLogoUrl={logoAsset?.url ?? null}
        liveLogoUrl={publishedLogoUrl}
      />
      {dialog}
    </div>
  );
}

function Panel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <Card className="p-5 sm:p-6"><div className="mb-5"><h2 className="text-base font-semibold tracking-tight">{title}</h2><p className="mt-1 max-w-3xl text-sm text-[var(--admin-ink-secondary)]">{description}</p></div>{children}</Card>;
}

function SwatchSelect({ value, options, onChange, id, disabled, includeInherit }: { value: string; options: Array<{ value: string; label: string; hex: string }>; onChange: (value: string) => void; id?: string; disabled?: boolean; includeInherit?: boolean }) {
  return <Select id={id} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>{includeInherit && <option value="">Surface default</option>}{options.map((option) => <option key={option.value} value={option.value}>{option.label} · {option.hex}</option>)}</Select>;
}

function BrandSnapshot({ config, logoAsset }: { config: BrandingConfig; logoAsset: MediaAsset | null }) {
  const swatches = new Map(config.swatches.map((swatch) => [swatch.id, swatch.hex]));
  const dark = swatches.get(config.roles.darkSurface.swatchId) ?? "#001B33";
  const light = swatches.get(config.roles.lightSurface.swatchId) ?? "#F2E9DE";
  const accent = swatches.get(config.roles.accentOnDark.swatchId) ?? "#E2902A";
  const onDark = swatches.get(config.roles.textOnDark.swatchId) ?? "#FFFFFF";
  const onLight = swatches.get(config.roles.textOnLight.swatchId) ?? "#001B33";
  return <div aria-label="Brand preview"><div className="p-5" style={{ background: dark, color: onDark }}><div className="mb-8 text-lg font-bold">{logoAsset ? <Image src={logoAsset.url} alt={config.logo.altText} width={logoAsset.width ?? 160} height={logoAsset.height ?? 40} className="h-8 max-w-40 object-contain object-left" /> : <>OSI<span style={{ color: accent }}>.</span></>}</div><p className="text-xs font-semibold uppercase tracking-[.14em]" style={{ color: accent }}>Built for the field</p><p className="mt-2 text-2xl font-semibold leading-tight">Engineered performance, clearly expressed.</p></div><div className="p-5" style={{ background: light, color: onLight }}><p className="text-lg font-semibold">A readable content surface</p><p className="mt-2 text-sm opacity-75">Typography, hierarchy, and contrast remain easy to assess while you edit.</p><span className="mt-4 inline-flex rounded-full px-3 py-2 text-xs font-semibold" style={{ background: accent, color: dark }}>Primary action</span></div></div>;
}
