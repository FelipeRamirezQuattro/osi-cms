"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createNavItemAction,
  deleteNavItemAction,
  moveNavItemAction,
  updateNavItemAction,
} from "@/lib/actions/navigation";
import type { Tables } from "@/lib/db/database.types";
import { useConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import type { LinkableResource } from "@/lib/data/navigation";

type NavItem = Tables<"nav_items">;

type FormValues = { label: string; href: string; badge: string; is_external: boolean };

const EMPTY_FORM: FormValues = { label: "", href: "", badge: "", is_external: false };

export function NavEditor({
  menuId,
  items,
  linkableResources,
}: {
  menuId: string;
  items: NavItem[];
  linkableResources: LinkableResource[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [addingUnder, setAddingUnder] = useState<string | null | undefined>(undefined);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { confirm, dialog } = useConfirmDialog();

  const topLevel = items.filter((i) => !i.parent_id);
  const childrenOf = (parentId: string) => items.filter((i) => i.parent_id === parentId);

  function refresh() {
    router.refresh();
  }

  function move(id: string, direction: "up" | "down") {
    startTransition(async () => {
      await moveNavItemAction(id, direction);
      refresh();
    });
  }

  async function remove(id: string) {
    const ok = await confirm({ title: "Delete this nav item?", tone: "danger", confirmLabel: "Delete" });
    if (!ok) return;
    startTransition(async () => {
      await deleteNavItemAction(id);
      refresh();
    });
  }

  function create(parentId: string | null, values: FormValues) {
    startTransition(async () => {
      await createNavItemAction({
        menu_id: menuId,
        parent_id: parentId,
        label: values.label,
        href: values.href,
        badge: values.badge || null,
        is_external: values.is_external,
      });
      setAddingUnder(undefined);
      refresh();
    });
  }

  function update(id: string, parentId: string | null, values: FormValues) {
    startTransition(async () => {
      await updateNavItemAction(id, {
        label: values.label,
        href: values.href,
        badge: values.badge || null,
        is_external: values.is_external,
        parent_id: parentId,
      });
      setEditingId(null);
      refresh();
    });
  }

  return (
    <div className="space-y-4">
      {topLevel.map((item, index) => (
        <div key={item.id} className="rounded border border-osi-sand-300 bg-osi-white">
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="flex-1 text-sm font-medium">
              {item.label} <span className="text-xs opacity-50">{item.href}</span>
              {item.badge && <span className="ml-2 rounded bg-osi-gold-500/20 px-1.5 py-0.5 text-[10px] uppercase">{item.badge}</span>}
            </span>
            <button type="button" onClick={() => move(item.id, "up")} disabled={isPending || index === 0} className="text-xs disabled:opacity-30">
              ↑
            </button>
            <button
              type="button"
              onClick={() => move(item.id, "down")}
              disabled={isPending || index === topLevel.length - 1}
              className="text-xs disabled:opacity-30"
            >
              ↓
            </button>
            <button type="button" onClick={() => setEditingId(item.id)} className="text-xs hover:underline">
              Edit
            </button>
            <button type="button" onClick={() => setAddingUnder(item.id)} className="text-xs hover:underline">
              + Child
            </button>
            <button type="button" onClick={() => remove(item.id)} className="text-xs text-red-600 hover:underline">
              Delete
            </button>
          </div>

          {editingId === item.id && (
            <div className="border-t border-osi-sand-300 p-3">
              <NavItemForm
                initial={{ label: item.label, href: item.href, badge: item.badge ?? "", is_external: item.is_external }}
                linkableResources={linkableResources}
                onCancel={() => setEditingId(null)}
                onSubmit={(values) => update(item.id, item.parent_id, values)}
              />
            </div>
          )}

          <div className="space-y-1 border-t border-osi-sand-300 px-3 py-2 pl-8">
            {childrenOf(item.id).map((child, childIndex) => (
              <div key={child.id}>
                <div className="flex items-center gap-2 py-1">
                  <span className="flex-1 text-sm">
                    {child.label} <span className="text-xs opacity-50">{child.href}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => move(child.id, "up")}
                    disabled={isPending || childIndex === 0}
                    className="text-xs disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(child.id, "down")}
                    disabled={isPending || childIndex === childrenOf(item.id).length - 1}
                    className="text-xs disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button type="button" onClick={() => setEditingId(child.id)} className="text-xs hover:underline">
                    Edit
                  </button>
                  <button type="button" onClick={() => remove(child.id)} className="text-xs text-red-600 hover:underline">
                    Delete
                  </button>
                </div>
                {editingId === child.id && (
                  <NavItemForm
                    initial={{ label: child.label, href: child.href, badge: child.badge ?? "", is_external: child.is_external }}
                    linkableResources={linkableResources}
                    onCancel={() => setEditingId(null)}
                    onSubmit={(values) => update(child.id, child.parent_id, values)}
                  />
                )}
              </div>
            ))}
            {addingUnder === item.id && (
              <NavItemForm initial={EMPTY_FORM} linkableResources={linkableResources} onCancel={() => setAddingUnder(undefined)} onSubmit={(values) => create(item.id, values)} />
            )}
          </div>
        </div>
      ))}

      {addingUnder === null ? (
        <div className="rounded border border-osi-sand-300 bg-osi-white p-3">
          <NavItemForm initial={EMPTY_FORM} linkableResources={linkableResources} onCancel={() => setAddingUnder(undefined)} onSubmit={(values) => create(null, values)} />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAddingUnder(null)}
          className="rounded bg-osi-navy-900 px-4 py-2 text-xs uppercase tracking-wide-label text-osi-white"
        >
          + Add top-level item
        </button>
      )}
      {dialog}
    </div>
  );
}

const CUSTOM_LINK_VALUE = "__custom";

function NavItemForm({
  initial,
  linkableResources,
  onSubmit,
  onCancel,
}: {
  initial: FormValues;
  linkableResources: LinkableResource[];
  onSubmit: (values: FormValues) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState(initial);
  // A stored href that happens to match a real page/product's current href
  // starts the picker on that resource; anything else (an external URL, a
  // "#" category header, a since-renamed slug) starts it on "Custom URL" so
  // existing items are never silently reinterpreted.
  const matchingResource = linkableResources.find((resource) => resource.href === initial.href);
  const [linkSelection, setLinkSelection] = useState<string>(matchingResource?.id ?? CUSTOM_LINK_VALUE);
  const pageResources = linkableResources.filter((resource) => resource.group === "Page");
  const productResources = linkableResources.filter((resource) => resource.group === "Product");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
      className="grid grid-cols-2 gap-2 py-2"
    >
      {/*
       * This is a compact, repeated-per-row inline editor (one per nav
       * item, plus an "add child" row under each) — a visible caption
       * above every field would multiply the grid's height for every
       * item in the tree, so these use aria-label (a real accessible
       * name, not just a placeholder that vanishes on input) instead of
       * a visible <span> label like the standalone forms elsewhere in
       * this file's siblings (new-page-form.tsx, new-shared-section-form.tsx).
       */}
      <input
        value={values.label}
        onChange={(e) => setValues({ ...values, label: e.target.value })}
        placeholder="Label"
        aria-label="Label"
        required
        className="rounded border border-osi-sand-300 px-2 py-1 text-sm"
      />
      <select
        value={linkSelection}
        onChange={(e) => {
          const nextId = e.target.value;
          setLinkSelection(nextId);
          if (nextId === CUSTOM_LINK_VALUE) return;
          const resource = linkableResources.find((r) => r.id === nextId);
          if (resource) setValues((prev) => ({ ...prev, href: resource.href }));
        }}
        aria-label="Link to a page or product"
        className="rounded border border-osi-sand-300 px-2 py-1 text-sm"
      >
        <option value={CUSTOM_LINK_VALUE}>Custom URL / anchor…</option>
        {pageResources.length > 0 && (
          <optgroup label="Pages">
            {pageResources.map((resource) => (
              <option key={resource.id} value={resource.id}>
                {resource.label}
              </option>
            ))}
          </optgroup>
        )}
        {productResources.length > 0 && (
          <optgroup label="Products">
            {productResources.map((resource) => (
              <option key={resource.id} value={resource.id}>
                {resource.label}
              </option>
            ))}
          </optgroup>
        )}
      </select>
      {linkSelection === CUSTOM_LINK_VALUE ? (
        <input
          value={values.href}
          onChange={(e) => setValues({ ...values, href: e.target.value })}
          placeholder="/href, #anchor, or https://…"
          aria-label="Link"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          required
          className="col-span-2 rounded border border-osi-sand-300 px-2 py-1 text-sm"
        />
      ) : (
        <p className="col-span-2 truncate text-xs opacity-60">→ {values.href}</p>
      )}
      <input
        value={values.badge}
        onChange={(e) => setValues({ ...values, badge: e.target.value })}
        placeholder="Badge (optional)"
        aria-label="Badge (optional)"
        autoComplete="off"
        className="rounded border border-osi-sand-300 px-2 py-1 text-sm"
      />
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={values.is_external}
          onChange={(e) => setValues({ ...values, is_external: e.target.checked })}
        />
        External link
      </label>
      <div className="col-span-2 flex gap-2">
        <button type="submit" className="rounded bg-osi-navy-900 px-3 py-1 text-xs uppercase tracking-wide-label text-osi-white">
          Save
        </button>
        <button type="button" onClick={onCancel} className="text-xs opacity-70 hover:underline">
          Cancel
        </button>
      </div>
    </form>
  );
}
