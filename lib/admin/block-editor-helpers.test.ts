import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useFieldArray, useForm } from "react-hook-form";
import {
  cloneBlockForDuplicate,
  decideAutosave,
  deriveAutosaveDisplayStatus,
  isManualSaveActionBlocked,
  resolveBlockFocusTarget,
  shouldTrackFailedAutosaveValue,
} from "@/lib/admin/block-editor-helpers";

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

describe("isManualSaveActionBlocked (fix-round Finding 1 — CRITICAL)", () => {
  it("is not blocked when neither a manual action nor an autosave is in flight", () => {
    expect(isManualSaveActionBlocked({ actionInFlight: false, isAutosaving: false })).toBe(false);
  });

  it("is blocked while the action's own transition (isSaving/isPublishing) is in flight", () => {
    expect(isManualSaveActionBlocked({ actionInFlight: true, isAutosaving: false })).toBe(true);
  });

  it("is blocked while an autosave is in flight, even if the manual action itself isn't running yet — the collision this finding fixes", () => {
    expect(isManualSaveActionBlocked({ actionInFlight: false, isAutosaving: true })).toBe(true);
  });

  it("is blocked when both are in flight", () => {
    expect(isManualSaveActionBlocked({ actionInFlight: true, isAutosaving: true })).toBe(true);
  });
});

describe("shouldTrackFailedAutosaveValue (fix-round Finding 5 — symmetric conflict handling)", () => {
  it("does not track a version conflict as a failure worth skip-retrying", () => {
    expect(shouldTrackFailedAutosaveValue({ conflict: true })).toBe(false);
  });

  it("tracks a real validation failure", () => {
    expect(shouldTrackFailedAutosaveValue({ conflict: false })).toBe(true);
    expect(shouldTrackFailedAutosaveValue({})).toBe(true);
  });

  it("end-to-end with decideAutosave: a conflict never gets recorded, so the very next attempt against the same content still fires instead of being permanently skipped", () => {
    const conflictResult = { status: "error" as const, conflict: true };
    // Mirrors the autosave attempt handler: only record into
    // lastFailedAutosaveValue when shouldTrackFailedAutosaveValue says so.
    const lastFailedAutosaveValue = shouldTrackFailedAutosaveValue(conflictResult)
      ? '{"title":"A"}'
      : null;
    expect(lastFailedAutosaveValue).toBeNull();

    const decision = decideAutosave({
      enabled: true,
      isDirty: true,
      serializedValue: '{"title":"A"}',
      lastFailedValue: lastFailedAutosaveValue,
    });
    expect(decision).toBe("attempt");
  });

  it("contrast: a real (non-conflict) validation failure IS recorded and does skip-retry the same unchanged content", () => {
    const validationFailure = { status: "error" as const, conflict: false };
    const lastFailedAutosaveValue = shouldTrackFailedAutosaveValue(validationFailure) ? '{"title":"A"}' : null;
    expect(lastFailedAutosaveValue).toBe('{"title":"A"}');

    const decision = decideAutosave({
      enabled: true,
      isDirty: true,
      serializedValue: '{"title":"A"}',
      lastFailedValue: lastFailedAutosaveValue,
    });
    expect(decision).toBe("skip-unchanged-failure");
  });
});

describe("deriveAutosaveDisplayStatus (fix-round Finding 2 — error state must actually be reachable)", () => {
  it("shows 'saving' while an autosave is in flight, regardless of dirty/outcome", () => {
    expect(deriveAutosaveDisplayStatus({ isAutosaving: true, isDirty: true, autosaveOutcome: "error" })).toBe(
      "saving",
    );
  });

  it("shows 'error' even though the form is still dirty — the bug: isDirty stays true forever after a failed autosave (it deliberately never resets the form), so checking isDirty before autosaveOutcome made 'error' unreachable", () => {
    expect(deriveAutosaveDisplayStatus({ isAutosaving: false, isDirty: true, autosaveOutcome: "error" })).toBe(
      "error",
    );
  });

  it("shows 'dirty' when there's no error and the form has unsaved changes", () => {
    expect(deriveAutosaveDisplayStatus({ isAutosaving: false, isDirty: true, autosaveOutcome: "idle" })).toBe(
      "dirty",
    );
  });

  it("falls back to the raw outcome once the form is clean again", () => {
    expect(deriveAutosaveDisplayStatus({ isAutosaving: false, isDirty: false, autosaveOutcome: "saved" })).toBe(
      "saved",
    );
    expect(deriveAutosaveDisplayStatus({ isAutosaving: false, isDirty: false, autosaveOutcome: "idle" })).toBe(
      "idle",
    );
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
      const { control, getValues, setValue } = useForm<{ blocks: Block[] }>({ defaultValues: { blocks: initialBlocks } });
      const { fields, insert } = useFieldArray({ control, name: "blocks" });
      return { fields, insert, getValues, setValue };
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

  it("fix-round Finding 3: fields[index] is stale after a plain field edit, while getValues() is fresh — this is exactly why duplicateBlockAt/toggleBlockVisible must read via getValues()", () => {
    const { result } = setup([{ type: "rich_text", is_visible: true, data: { body: "original" } }]);

    // Simulates the user typing into the block's registered input — a
    // plain value change, not a field-array action (insert/remove/move),
    // so useFieldArray's `fields` snapshot is never told to refresh.
    act(() => {
      result.current.setValue("blocks.0.data.body", "edited by the user");
    });

    // The bug: reading the "live" content via the stale fields snapshot
    // still shows the pre-edit value.
    expect((result.current.fields[0].data as { body: string }).body).toBe("original");

    // The fix: getValues() always reflects the form's actual current state.
    expect((result.current.getValues("blocks.0") as Block).data.body).toBe("edited by the user");

    // Duplicating from the stale snapshot (the pre-fix behavior) would
    // silently discard the edit into the copy.
    const staleSource = result.current.fields[0] as unknown as Block;
    expect(cloneBlockForDuplicate(staleSource).data.body).toBe("original");

    // Duplicating from getValues() (the fix) carries the live edit over.
    const liveSource = result.current.getValues("blocks.0") as Block;
    expect(cloneBlockForDuplicate(liveSource).data.body).toBe("edited by the user");
  });
});
