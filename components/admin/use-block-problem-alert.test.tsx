import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useSaveProblemAlert, type SaveProblem } from "@/components/admin/use-block-problem-alert";

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    const wasOpen = this.hasAttribute("open");
    this.removeAttribute("open");
    if (wasOpen) this.dispatchEvent(new Event("close"));
  };
});
afterEach(cleanup);

function Harness({ problem, reveal }: { problem: SaveProblem; reveal: (p: SaveProblem) => void }) {
  const { reportProblem, alertDialog } = useSaveProblemAlert(reveal);
  return (
    <div>
      <button onClick={() => void reportProblem(problem).then((handled) => (document.body.dataset.handled = String(handled)))}>go</button>
      {alertDialog}
    </div>
  );
}

describe("useSaveProblemAlert (a failed save is an alert, not a line at the top of the page)", () => {
  it("a block problem opens a warning dialog and 'Go to block' reveals that block", async () => {
    const reveal = vi.fn();
    const problem = { message: "Block 3 (Columns): add at least 2 columns — you have 1.", blockIndex: 2, field: "columns" };
    render(<Harness problem={problem} reveal={reveal} />);
    fireEvent.click(screen.getByText("go"));
    expect(await screen.findByText("This block can't be saved yet")).toBeInTheDocument();
    expect(screen.getByText(problem.message)).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Go to block" }));
    });
    expect(reveal).toHaveBeenCalledWith(problem);
  });

  it("a problem with no block is a plain 'Couldn't save' alert with no Go-to-block button", async () => {
    render(<Harness problem={{ message: "That slug is already in use." }} reveal={vi.fn()} />);
    fireEvent.click(screen.getByText("go"));
    expect(await screen.findByText("Couldn't save")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Go to block" })).toBeNull();
  });

  it("leaves a version conflict to the caller's banner (it carries the Reload action)", async () => {
    render(<Harness problem={{ message: "Changed by another editor.", conflict: true }} reveal={vi.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByText("go"));
    });
    expect(document.body.dataset.handled).toBe("false");
    expect(screen.queryByText("Couldn't save")).toBeNull();
  });
});
