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

type NavItem = Tables<"nav_items">;

type FormValues = { label: string; href: string; badge: string; is_external: boolean };

const EMPTY_FORM: FormValues = { label: "", href: "", badge: "", is_external: false };

export function NavEditor({ menuId, items }: { menuId: string; items: NavItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [addingUnder, setAddingUnder] = useState<string | null | undefined>(undefined);
  const [editingId, setEditingId] = useState<string | null>(null);

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

  function remove(id: string) {
    if (!window.confirm("Delete this nav item?")) return;
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
                    onCancel={() => setEditingId(null)}
                    onSubmit={(values) => update(child.id, child.parent_id, values)}
                  />
                )}
              </div>
            ))}
            {addingUnder === item.id && (
              <NavItemForm initial={EMPTY_FORM} onCancel={() => setAddingUnder(undefined)} onSubmit={(values) => create(item.id, values)} />
            )}
          </div>
        </div>
      ))}

      {addingUnder === null ? (
        <div className="rounded border border-osi-sand-300 bg-osi-white p-3">
          <NavItemForm initial={EMPTY_FORM} onCancel={() => setAddingUnder(undefined)} onSubmit={(values) => create(null, values)} />
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
    </div>
  );
}

function NavItemForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: FormValues;
  onSubmit: (values: FormValues) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState(initial);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
      className="grid grid-cols-2 gap-2 py-2"
    >
      <input
        value={values.label}
        onChange={(e) => setValues({ ...values, label: e.target.value })}
        placeholder="Label"
        required
        className="rounded border border-osi-sand-300 px-2 py-1 text-sm"
      />
      <input
        value={values.href}
        onChange={(e) => setValues({ ...values, href: e.target.value })}
        placeholder="/href"
        required
        className="rounded border border-osi-sand-300 px-2 py-1 text-sm"
      />
      <input
        value={values.badge}
        onChange={(e) => setValues({ ...values, badge: e.target.value })}
        placeholder="Badge (optional)"
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
