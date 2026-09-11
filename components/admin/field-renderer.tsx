"use client";

import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import type { FieldSpec } from "@/lib/blocks/admin-fields";
import { MediaPicker } from "@/components/admin/media-picker";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { useRelationOptions } from "@/components/admin/relation-options";

// The block editor's field shapes are fully dynamic — one shape per block
// type, described at runtime by FieldSpec (see lib/blocks/admin-fields.ts)
// — so there is no static form type to hand react-hook-form. `any` is
// confined to this file and admin-block-fields-form.tsx for that reason.
/* eslint-disable @typescript-eslint/no-explicit-any */

const INPUT_CLASS = "w-full rounded border border-osi-sand-300 px-3 py-2 text-sm";

function LabeledField({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block space-y-1 text-sm">
      <span className="block text-xs uppercase tracking-wide-label opacity-70">{label}</span>
      {children}
    </label>
  );
}

// `<label>` is for associating text with an actual form control
// (input/select/textarea) — wrapping a button-driven widget (the media
// picker) or a contenteditable one (Tiptap) in one instead hides that
// widget's own interactive elements from the accessibility tree (a real
// bug found via Playwright: MediaPicker's trigger button stopped being
// reachable by role). Same visual result, a <div> instead.
function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="block space-y-1 text-sm">
      <span className="block text-xs uppercase tracking-wide-label opacity-70">{label}</span>
      {children}
    </div>
  );
}

export function defaultForFieldSpec(spec: FieldSpec): unknown {
  switch (spec.type) {
    case "boolean":
      return false;
    case "number":
      return 0;
    case "select":
      return spec.options[0] ?? "";
    case "array":
    case "multi-relation":
      return [];
    case "object":
      return Object.fromEntries(spec.fields.map((sub) => [sub.key, defaultForFieldSpec(sub)]));
    case "richtext":
      return { type: "doc", content: [] };
    default:
      return "";
  }
}

export function FieldRenderer({ spec, name }: { spec: FieldSpec; name: string }) {
  const { control, register } = useFormContext<any>();

  switch (spec.type) {
    case "text":
      return (
        <LabeledField label={spec.label}>
          <input {...register(name)} className={INPUT_CLASS} />
        </LabeledField>
      );
    case "textarea":
      return (
        <LabeledField label={spec.label}>
          <textarea {...register(name)} rows={4} className={INPUT_CLASS} />
        </LabeledField>
      );
    case "number":
      return (
        <LabeledField label={spec.label}>
          <input type="number" {...register(name, { valueAsNumber: true })} className={INPUT_CLASS} />
        </LabeledField>
      );
    case "boolean":
      return (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register(name)} className="h-4 w-4" />
          {spec.label}
        </label>
      );
    case "select":
      return (
        <LabeledField label={spec.label}>
          <select {...register(name)} className={INPUT_CLASS}>
            {spec.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </LabeledField>
      );
    case "date":
      return (
        <LabeledField label={spec.label}>
          <input type="date" {...register(name)} className={INPUT_CLASS} />
        </LabeledField>
      );
    case "relation":
      return <RelationFieldRenderer spec={spec} name={name} />;
    case "multi-relation":
      return <MultiRelationFieldRenderer spec={spec} name={name} />;
    case "image":
      return (
        <FieldGroup label={spec.label}>
          <Controller
            control={control}
            name={name}
            render={({ field }) => <MediaPicker value={field.value} onChange={field.onChange} label={spec.label} />}
          />
        </FieldGroup>
      );
    case "richtext":
      return (
        <FieldGroup label={spec.label}>
          <Controller
            control={control}
            name={name}
            render={({ field }) => <RichTextEditor value={field.value} onChange={field.onChange} />}
          />
        </FieldGroup>
      );
    case "object":
      return (
        <fieldset className="space-y-3 rounded border border-osi-sand-300 p-3">
          <legend className="px-1 text-xs uppercase tracking-wide-label opacity-70">{spec.label}</legend>
          {spec.fields.map((sub) => (
            <FieldRenderer key={sub.key} spec={sub} name={`${name}.${sub.key}`} />
          ))}
        </fieldset>
      );
    case "array":
      return <ArrayFieldRenderer spec={spec} name={name} />;
  }
}

function RelationFieldRenderer({ spec, name }: { spec: Extract<FieldSpec, { type: "relation" }>; name: string }) {
  const { register } = useFormContext<any>();
  const options = useRelationOptions(spec.relation);
  return (
    <LabeledField label={spec.label}>
      <select {...register(name)} className={INPUT_CLASS}>
        {spec.optional && <option value="">—</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </LabeledField>
  );
}

function MultiRelationFieldRenderer({
  spec,
  name,
}: {
  spec: Extract<FieldSpec, { type: "multi-relation" }>;
  name: string;
}) {
  const { control } = useFormContext<any>();
  const options = useRelationOptions(spec.relation);

  return (
    <LabeledField label={spec.label}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => {
          const selected: string[] = Array.isArray(field.value) ? field.value : [];
          function toggle(value: string) {
            field.onChange(
              selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value],
            );
          }
          return (
            <div className="max-h-48 space-y-1 overflow-y-auto rounded border border-osi-sand-300 p-3">
              {options.length === 0 && <p className="text-xs text-osi-slate-400">No options available.</p>}
              {options.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.includes(opt.value)}
                    onChange={() => toggle(opt.value)}
                    className="h-4 w-4"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          );
        }}
      />
    </LabeledField>
  );
}

function ArrayFieldRenderer({
  spec,
  name,
}: {
  spec: Extract<FieldSpec, { type: "array" }>;
  name: string;
}) {
  const { control, register } = useFormContext<any>();
  const { fields, append, remove, move } = useFieldArray({ control, name });

  const atMax = spec.maxItems !== undefined && fields.length >= spec.maxItems;
  const atMin = spec.minItems !== undefined && fields.length <= spec.minItems;

  function addItem() {
    if (spec.itemFields) {
      append(Object.fromEntries(spec.itemFields.map((f) => [f.key, defaultForFieldSpec(f)])));
    } else {
      append("");
    }
  }

  return (
    <fieldset className="space-y-3 rounded border border-osi-sand-300 p-3">
      <div className="flex items-center justify-between">
        <legend className="px-1 text-xs uppercase tracking-wide-label opacity-70">{spec.label}</legend>
        <button
          type="button"
          onClick={addItem}
          disabled={atMax}
          className="text-xs underline disabled:opacity-40"
        >
          + Add
        </button>
      </div>
      <div className="space-y-3">
        {fields.map((item, index) => (
          <div key={item.id} className="space-y-2 rounded border border-osi-sand-300/60 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs opacity-50">#{index + 1}</span>
              <div className="flex gap-3 text-xs">
                {index > 0 && (
                  <button type="button" onClick={() => move(index, index - 1)} aria-label="Move up">
                    ↑
                  </button>
                )}
                {index < fields.length - 1 && (
                  <button type="button" onClick={() => move(index, index + 1)} aria-label="Move down">
                    ↓
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(index)}
                  disabled={atMin}
                  className="text-red-600 disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
            </div>
            {spec.itemFields ? (
              spec.itemFields.map((sub) => (
                <FieldRenderer key={sub.key} spec={sub} name={`${name}.${index}.${sub.key}`} />
              ))
            ) : (
              <input {...register(`${name}.${index}` as const)} className={INPUT_CLASS} />
            )}
          </div>
        ))}
        {fields.length === 0 && <p className="text-xs text-osi-slate-400">No items yet.</p>}
      </div>
    </fieldset>
  );
}
