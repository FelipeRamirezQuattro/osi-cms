import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const actions = vi.hoisted(() => ({
  addSubscriberAction: vi.fn(),
  createTagAction: vi.fn(),
  deleteSubscriberAction: vi.fn(),
  deleteTagAction: vi.fn(),
  exportSubscribersCsvAction: vi.fn(),
  setSubscriberTagsAction: vi.fn(),
}));
const refresh = vi.hoisted(() => vi.fn());
const confirm = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions/newsletter-subscribers", () => actions);
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
  usePathname: () => "/admin/newsletter/subscribers",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/components/admin/ui/confirm-dialog", () => ({ useConfirmDialog: () => ({ confirm, dialog: null }) }));

import { SubscribersAdmin } from "@/app/admin/(dashboard)/newsletter/subscribers/subscribers-admin";

afterEach(cleanup);

const tags = [{ id: "t1", name: "Distributors", created_at: "" }];

function admin(overrides: Partial<Parameters<typeof SubscribersAdmin>[0]> = {}) {
  return <SubscribersAdmin subscribers={[]} tags={tags} role="editor" {...overrides} />;
}

describe("SubscribersAdmin — add subscriber", () => {
  beforeEach(() => {
    refresh.mockReset();
    confirm.mockReset().mockResolvedValue(true);
    for (const fn of Object.values(actions)) fn.mockReset();
    actions.addSubscriberAction.mockResolvedValue({ status: "success", alreadySubscribed: false });
  });

  it("shows the add-subscriber form with the existing tags to pick from", () => {
    render(admin());
    expect(screen.getByRole("heading", { name: "Add subscriber" })).toBeInTheDocument();
    expect(screen.getByLabelText("New subscriber email")).toBeInTheDocument();
    expect(screen.getByLabelText("Distributors")).toBeInTheDocument();
  });

  it("disables the button until an email is entered", () => {
    render(admin());
    expect(screen.getByRole("button", { name: "Add subscriber" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("New subscriber email"), { target: { value: "a@example.com" } });
    expect(screen.getByRole("button", { name: "Add subscriber" })).toBeEnabled();
  });

  it("submits the email and selected tags, clears the form, and refreshes on success", async () => {
    render(admin());
    fireEvent.change(screen.getByLabelText("New subscriber email"), { target: { value: "a@example.com" } });
    fireEvent.click(screen.getByLabelText("Distributors"));
    fireEvent.click(screen.getByRole("button", { name: "Add subscriber" }));

    await waitFor(() => expect(actions.addSubscriberAction).toHaveBeenCalledWith("a@example.com", ["t1"]));
    expect(await screen.findByText("Added and marked subscribed.")).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
    expect(screen.getByLabelText("New subscriber email")).toHaveValue("");
    expect(screen.getByLabelText("Distributors")).not.toBeChecked();
  });

  it("tells the editor when the address was already subscribed, without treating it as an error", async () => {
    actions.addSubscriberAction.mockResolvedValue({ status: "success", alreadySubscribed: true });
    render(admin());
    fireEvent.change(screen.getByLabelText("New subscriber email"), { target: { value: "a@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Add subscriber" }));
    expect(await screen.findByText(/Already subscribed/)).toBeInTheDocument();
    expect(confirm).not.toHaveBeenCalled();
  });

  it("shows a server validation error in the confirm dialog and keeps the typed email", async () => {
    // The browser's own type="email" check catches an obviously malformed
    // value before our submit handler ever runs — this exercises the
    // stricter server-side rule (max length) that native validation lets
    // through, which is the case that can actually reach the action.
    actions.addSubscriberAction.mockResolvedValue({ status: "error", message: "Enter a valid email address." });
    const tooLong = `${"a".repeat(250)}@x.com`;
    render(admin());
    fireEvent.change(screen.getByLabelText("New subscriber email"), { target: { value: tooLong } });
    fireEvent.click(screen.getByRole("button", { name: "Add subscriber" }));
    await waitFor(() => expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ title: "Can't add subscriber" })));
    expect(screen.getByLabelText("New subscriber email")).toHaveValue(tooLong);
  });

  it("submits with no tags when the subscriber list has none yet", () => {
    render(admin({ tags: [] }));
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("New subscriber email"), { target: { value: "a@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Add subscriber" }));
    expect(actions.addSubscriberAction).toHaveBeenCalledWith("a@example.com", []);
  });
});
