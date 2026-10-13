import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RevisionsPanel } from "./revisions-panel";

afterEach(cleanup);

describe("RevisionsPanel (PAG-09)", () => {
  it("is always visible, with an explanatory empty state", () => {
    render(<RevisionsPanel revisions={[]} onRestore={() => {}} />);
    expect(screen.getByRole("heading", { name: /version history \(0\)/i })).toBeTruthy();
    expect(screen.getByText("Versions are saved each time you publish.")).toBeTruthy();
  });

  it("lists every version and restores the chosen one", () => {
    const onRestore = vi.fn();
    render(
      <RevisionsPanel
        revisions={[
          { id: "r2", created_at: "2026-10-08T15:00:00Z" },
          { id: "r1", created_at: "2026-10-07T15:00:00Z" },
        ]}
        onRestore={onRestore}
      />,
    );
    expect(screen.getByRole("heading", { name: /\(2\)/ })).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "Restore" })[1]);
    expect(onRestore).toHaveBeenCalledWith("r1");
  });
});
