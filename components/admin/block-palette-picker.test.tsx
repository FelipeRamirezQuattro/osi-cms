import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { BlockPalettePicker } from "@/components/admin/block-palette-picker";
import type { BlockPaletteEntry } from "@/lib/blocks/registry";

afterEach(cleanup);

const entries: BlockPaletteEntry[] = [
  {
    type: "hero_full",
    label: "Full-bleed hero",
    category: "hero",
    description: "Full-bleed photo hero — use for the homepage.",
    adminFields: [],
    defaults: {},
    appearance: { surface: true, accent: true, typography: ["display"] },
  },
  {
    type: "rich_text",
    label: "Rich text",
    category: "content",
    description: "Tiptap-authored prose — use for migrated legacy copy.",
    adminFields: [],
    defaults: {},
    appearance: { surface: true, accent: false, typography: ["heading", "body"] },
  },
  {
    type: "contact_form",
    label: "Contact form",
    category: "forms",
    description: "The site's honeypot + rate-limited contact form.",
    adminFields: [],
    defaults: {},
    appearance: { surface: true, accent: true, typography: ["label"] },
  },
];

describe("BlockPalettePicker", () => {
  it("renders every entry grouped under its category label", () => {
    render(<BlockPalettePicker entries={entries} onAdd={() => {}} />);
    expect(screen.getByText("Hero")).toBeInTheDocument();
    expect(screen.getByText("Content")).toBeInTheDocument();
    expect(screen.getByText("Forms")).toBeInTheDocument();
    expect(screen.getByText("Full-bleed hero")).toBeInTheDocument();
    expect(screen.getByText(/use for the homepage/)).toBeInTheDocument();
  });

  it("calls onAdd with the clicked entry immediately (no separate confirm step)", () => {
    const onAdd = vi.fn();
    render(<BlockPalettePicker entries={entries} onAdd={onAdd} />);
    fireEvent.click(screen.getByText("Rich text"));
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledWith(entries[1]);
  });

  it("filters by search across label, description, and category", () => {
    render(<BlockPalettePicker entries={entries} onAdd={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText("Search blocks by name or purpose…"), {
      target: { value: "honeypot" },
    });
    expect(screen.getByText("Contact form")).toBeInTheDocument();
    expect(screen.queryByText("Rich text")).not.toBeInTheDocument();
    expect(screen.queryByText("Full-bleed hero")).not.toBeInTheDocument();
  });

  it("shows a no-results message and hides every category when nothing matches", () => {
    render(<BlockPalettePicker entries={entries} onAdd={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText("Search blocks by name or purpose…"), {
      target: { value: "zzz-nonexistent" },
    });
    expect(screen.getByText('No blocks match "zzz-nonexistent".')).toBeInTheDocument();
    expect(screen.queryByText("Hero")).not.toBeInTheDocument();
  });
});
