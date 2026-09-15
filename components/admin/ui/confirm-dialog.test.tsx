import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useConfirmDialog } from "@/components/admin/ui/confirm-dialog";

/**
 * ConfirmDialog replaces every window.confirm()/window.prompt() call in
 * the admin (Task 12) — these tests exercise the actual async
 * resolve/cancel/validate behavior a native dialog can't offer, not just
 * that it renders.
 */

function ConfirmHarness({ tone }: { tone?: "danger" | "default" }) {
  const { confirm, dialog } = useConfirmDialog();
  const [result, setResult] = useState<string>("pending");

  async function run() {
    const ok = await confirm({
      title: "Delete this product?",
      message: "This cannot be undone.",
      consequences: ["3 pages reference this product"],
      tone,
    });
    setResult(ok ? "confirmed" : "cancelled");
  }

  return (
    <div>
      <button onClick={run}>Open confirm</button>
      <p data-testid="result">{result}</p>
      {dialog}
    </div>
  );
}

function PromptHarness() {
  const { prompt, dialog } = useConfirmDialog();
  const [result, setResult] = useState<string>("pending");

  async function run() {
    const value = await prompt({
      title: "Slug for the duplicate",
      label: "Slug",
      defaultValue: "about-copy",
      validate: (value) => (value.trim() ? null : "Slug is required"),
    });
    setResult(value === null ? "cancelled" : `value:${value}`);
  }

  return (
    <div>
      <button onClick={run}>Open prompt</button>
      <p data-testid="result">{result}</p>
      {dialog}
    </div>
  );
}

beforeEach(() => {
  // jsdom doesn't implement <dialog>'s showModal/close (see media-picker.test.tsx).
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

describe("useConfirmDialog / ConfirmDialog — confirm()", () => {
  it("resolves true and shows consequences when the user confirms", async () => {
    render(<ConfirmHarness />);
    fireEvent.click(screen.getByText("Open confirm"));

    expect(await screen.findByText("Delete this product?")).toBeInTheDocument();
    expect(screen.getByText("3 pages reference this product")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    });

    expect(screen.getByTestId("result")).toHaveTextContent("confirmed");
  });

  it("resolves false when the user cancels", async () => {
    render(<ConfirmHarness />);
    fireEvent.click(screen.getByText("Open confirm"));
    await screen.findByText("Delete this product?");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    });

    expect(screen.getByTestId("result")).toHaveTextContent("cancelled");
  });

  it("resolves false when the dialog is dismissed natively (Escape/backdrop)", async () => {
    render(<ConfirmHarness />);
    fireEvent.click(screen.getByText("Open confirm"));
    await screen.findByText("Delete this product?");

    const dialog = document.querySelector("dialog")!;
    await act(async () => {
      dialog.close();
    });

    expect(screen.getByTestId("result")).toHaveTextContent("cancelled");
  });

  it("only resolves once even though close() fires its own native close event", async () => {
    render(<ConfirmHarness />);
    fireEvent.click(screen.getByText("Open confirm"));
    await screen.findByText("Delete this product?");

    // Clicking Confirm calls settle(true), which itself calls
    // dialogRef.current.close() — our stub dispatches a synchronous
    // "close" event exactly like a real browser would. If settle() could
    // double-resolve, the second resolve() call would be a silent no-op
    // on an already-settled promise anyway, but the state machine must
    // still land on "confirmed", not be knocked back to "cancelled" by
    // the second settle() call.
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    });

    expect(screen.getByTestId("result")).toHaveTextContent("confirmed");
  });
});

describe("useConfirmDialog / ConfirmDialog — prompt()", () => {
  it("resolves the entered value on confirm", async () => {
    render(<PromptHarness />);
    fireEvent.click(screen.getByText("Open prompt"));

    const input = await screen.findByLabelText("Slug");
    expect(input).toHaveValue("about-copy");

    fireEvent.change(input, { target: { value: "about-copy-2" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "OK" }));
    });

    expect(screen.getByTestId("result")).toHaveTextContent("value:about-copy-2");
  });

  it("resolves null on cancel", async () => {
    render(<PromptHarness />);
    fireEvent.click(screen.getByText("Open prompt"));
    await screen.findByLabelText("Slug");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    });

    expect(screen.getByTestId("result")).toHaveTextContent("cancelled");
  });

  it("blocks submission and shows an error when validate() rejects the value", async () => {
    render(<PromptHarness />);
    fireEvent.click(screen.getByText("Open prompt"));

    const input = await screen.findByLabelText("Slug");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));

    expect(await screen.findByText("Slug is required")).toBeInTheDocument();
    // Still pending — the dialog must not have resolved/closed.
    expect(screen.getByTestId("result")).toHaveTextContent("pending");
    expect(input).toBeInTheDocument();
  });

  it("submits on Enter", async () => {
    render(<PromptHarness />);
    fireEvent.click(screen.getByText("Open prompt"));

    const input = await screen.findByLabelText("Slug");
    fireEvent.change(input, { target: { value: "careers-copy" } });
    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter" });
    });

    expect(screen.getByTestId("result")).toHaveTextContent("value:careers-copy");
  });
});
