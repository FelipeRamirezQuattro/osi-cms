import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useFieldArray, useForm } from "react-hook-form";
import { cloneBlockForDuplicate, decideAutosave, resolveBlockFocusTarget } from "@/lib/admin/block-editor-helpers";

describe("cloneBlockForDuplicate (Task 13b — duplicate-near-source)", () => {
  it("copies type/is_visible and deep-clones data", () => {
    const source = { type: "rich_text", is_visible: true, data: { items: [{ title: "A" }] } };
    const clone = cloneBlockForDuplicate(source);

    expect(clone).toEqual(source);
    expect(clone).not.toBe(source);
    expect(clone.data).not.toBe(source.data);
    expect((clone.data.items as unknown[])[0]).not.toBe((source.data.items as unknown[])[0]);
  });

  it("mutating the clone's nested data never touches the source (the bug a shallow {...block} copy would reintroduce)", () => {
    const source = { type: "accordion", is_visible: true, data: { items: [{ title: "Original" }] } };
    const clone = cloneBlockForDuplicate(source);

    (clone.data.items as { title: string }[])[0].title = "Edited copy";

    expect((source.data.items as { title: string }[])[0].title).toBe("Original");
  });

  it("handles a block with no data fields", () => {
    const source = { type: "spacer", is_visible: false, data: {} };
    expect(cloneBlockForDuplicate(source)).toEqual(source);
  });
});

describe("resolveBlockFocusTarget (Task 13b — scroll/focus to the failed block)", () => {
  function buildRow(innerHtml: string): HTMLDivElement {
    const row = document.createElement("div");
    row.innerHTML = innerHtml;
    document.body.appendChild(row);
    return row;
  }

  it("targets the exact named field when the validation error's field matches a rendered control", () => {
    const row = buildRow(`
      <button data-block-toggle>Hero</button>
      <div data-block-fields>
        <input name="blocks.2.data.background" />
        <input name="blocks.2.data.heading" />
      </div>
    `);

    const target = resolveBlockFocusTarget(row, { namePrefix: "blocks.2.data", field: "heading" });
    expect(target).toBe(row.querySelector('[name="blocks.2.data.heading"]'));
  });

  it("falls back to the first focusable control in the fields panel when the named field has no matching control", () => {
    // e.g. an `image`/`richtext`/`object`/`array` field — Controller-driven, no bare `name` attribute reachable this way.
    const row = buildRow(`
      <button data-block-toggle>Benefits cards</button>
      <div data-block-fields>
        <textarea name="blocks.1.data.caption"></textarea>
        <input name="blocks.1.data.title" />
      </div>
    `);

    const target = resolveBlockFocusTarget(row, { namePrefix: "blocks.1.data", field: "og_image_url" });
    expect(target).toBe(row.querySelector('[name="blocks.1.data.caption"]'));
  });

  it("falls back to the block's header toggle button when the fields panel isn't open/rendered", () => {
    // e.g. "Unknown block type" — there's no BlockPaletteEntry to render adminFields from at all.
    const row = buildRow(`<button data-block-toggle>Unknown block</button>`);

    const target = resolveBlockFocusTarget(row, { namePrefix: "blocks.0.data" });
    expect(target).toBe(row.querySelector("[data-block-toggle]"));
  });

  it("falls back to the first focusable control when no field was reported at all", () => {
    const row = buildRow(`
      <button data-block-toggle>Rich text</button>
      <div data-block-fields><textarea name="blocks.0.data.body"></textarea></div>
    `);

    const target = resolveBlockFocusTarget(row, { namePrefix: "blocks.0.data" });
    expect(target).toBe(row.querySelector('[name="blocks.0.data.body"]'));
  });
});

describe("decideAutosave (Task 13b — autosave gating)", () => {
  const base = { enabled: true, isDirty: true, serializedValue: '{"title":"A"}', lastFailedValue: null as string | null };

  it("skips when autosave is disabled (e.g. a manual save/publish is already in flight)", () => {
    expect(decideAutosave({ ...base, enabled: false })).toBe("skip-disabled");
  });

  it("skips when the form has no unsaved changes", () => {
    expect(decideAutosave({ ...base, isDirty: false })).toBe("skip-clean");
  });

  it("attempts when dirty, enabled, and nothing has failed yet", () => {
    expect(decideAutosave(base)).toBe("attempt");
  });

  it("skips retrying the exact same content that just failed validation", () => {
    expect(decideAutosave({ ...base, lastFailedValue: '{"title":"A"}' })).toBe("skip-unchanged-failure");
  });

  it("attempts again once the content changes, even if the previous content had failed", () => {
    expect(decideAutosave({ ...base, lastFailedValue: '{"title":"OLD"}' })).toBe("attempt");
  });
});

describe("duplicate-near-source against real react-hook-form insert() (Task 13b)", () => {
  // Exercises the exact mechanism page-editor.tsx/shared-section-editor.tsx
  // use (react-hook-form's own useFieldArray.insert), not just the pure
  // cloneBlockForDuplicate helper above — this is what actually proves a
  // duplicate lands next to its source rather than at the end of the list,
  // which was the whole point of this brief item (the prior behavior was
  // a bare `append({...field})`).
  type Block = { type: string; is_visible: boolean; data: Record<string, unknown> };

  function setup(initialBlocks: Block[]) {
    return renderHook(() => {
      const { control } = useForm<{ blocks: Block[] }>({ defaultValues: { blocks: initialBlocks } });
      const { fields, insert } = useFieldArray({ control, name: "blocks" });
      return { fields, insert };
    });
  }

  it("inserts a duplicate immediately after the source, not at the end", () => {
    const { result } = setup([
      { type: "hero_full", is_visible: true, data: { heading: "A" } },
      { type: "rich_text", is_visible: true, data: { body: "B" } },
      { type: "cta_band", is_visible: true, data: { label: "C" } },
    ]);

    act(() => {
      const source = result.current.fields[0];
      result.current.insert(1, cloneBlockForDuplicate({ type: source.type, is_visible: source.is_visible, data: source.data }));
    });

    expect(result.current.fields.map((f) => f.type)).toEqual(["hero_full", "hero_full", "rich_text", "cta_band"]);
    expect(result.current.fields[1].data).toEqual({ heading: "A" });
    // A real, distinct field-array entry — not the same row rendered twice.
    expect(result.current.fields[1].id).not.toBe(result.current.fields[0].id);
  });

  it("duplicating the last block still inserts right after it (not before position 0, not silently at the end)", () => {
    const { result } = setup([
      { type: "hero_full", is_visible: true, data: {} },
      { type: "rich_text", is_visible: true, data: { body: "last" } },
    ]);

    act(() => {
      const source = result.current.fields[1];
      result.current.insert(2, cloneBlockForDuplicate({ type: source.type, is_visible: source.is_visible, data: source.data }));
    });

    expect(result.current.fields.map((f) => f.type)).toEqual(["hero_full", "rich_text", "rich_text"]);
    expect(result.current.fields[2].data).toEqual({ body: "last" });
  });

  it("duplicating a middle block does not disturb blocks before it", () => {
    const { result } = setup([
      { type: "a", is_visible: true, data: { n: 1 } },
      { type: "b", is_visible: true, data: { n: 2 } },
      { type: "c", is_visible: true, data: { n: 3 } },
    ]);

    act(() => {
      const source = result.current.fields[1];
      result.current.insert(2, cloneBlockForDuplicate({ type: source.type, is_visible: source.is_visible, data: source.data }));
    });

    expect(result.current.fields.map((f) => f.data.n)).toEqual([1, 2, 2, 3]);
  });
});
