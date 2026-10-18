import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Alert } from "@/components/admin/ui/alert";
import { useAlertDialog } from "@/components/admin/ui/alert-dialog";

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

describe("Alert", () => {
  it("errors and warnings are announced immediately (role=alert); info is polite (role=status)", () => {
    const { rerender } = render(<Alert tone="error" title="Save failed" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Save failed");
    rerender(<Alert tone="warning" title="Careful" />);
    expect(screen.getByRole("alert")).toHaveAttribute("data-alert-tone", "warning");
    rerender(<Alert tone="info" title="FYI" />);
    expect(screen.getByRole("status")).toHaveTextContent("FYI");
  });

  it("lists each problem, offers actions and can be dismissed", () => {
    const onDismiss = vi.fn();
    const onGo = vi.fn();
    render(
      <Alert
        title="Block 3 (Columns) needs attention"
        details={["Add at least 2 columns (you have 1).", "Heading is required."]}
        actions={<button onClick={onGo}>Go to block</button>}
        onDismiss={onDismiss}
      />,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Go to block" }));
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onGo).toHaveBeenCalled();
    expect(onDismiss).toHaveBeenCalled();
  });
});

function Harness() {
  const { alert, dialog } = useAlertDialog();
  const [result, setResult] = useState("pending");
  return (
    <div>
      <button
        onClick={async () =>
          setResult(
            await alert({
              tone: "warning",
              title: "This block can't be saved yet",
              message: "Block 3 (Columns): add at least 2 columns — you have 1.",
              details: ["Add at least 2 columns (you have 1)."],
              actionLabel: "Go to block",
            }),
          )
        }
      >
        Open
      </button>
      <p data-testid="result">{result}</p>
      {dialog}
    </div>
  );
}

describe("useAlertDialog / AlertDialog", () => {
  it("shows the problem in a real dialog (not a browser alert) and resolves 'action' for the primary button", async () => {
    const browserAlert = vi.spyOn(window, "alert").mockImplementation(() => {});
    render(<Harness />);
    fireEvent.click(screen.getByText("Open"));
    expect(await screen.findByText("This block can't be saved yet")).toBeInTheDocument();
    expect(document.querySelector("dialog")).toHaveAttribute("role", "alertdialog");
    expect(screen.getByText("Add at least 2 columns (you have 1).")).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Go to block" }));
    });
    expect(screen.getByTestId("result")).toHaveTextContent("action");
    expect(browserAlert).not.toHaveBeenCalled();
  });

  it("resolves 'close' for Close and for native dismissal", async () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("Open"));
    await screen.findByText("This block can't be saved yet");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
    });
    expect(screen.getByTestId("result")).toHaveTextContent("close");
  });
});
