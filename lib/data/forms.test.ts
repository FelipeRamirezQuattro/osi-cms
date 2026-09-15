import { describe, expect, it, vi, beforeEach } from "vitest";
import { getPublishedFormDefinitionByKey, createFormDefinition, updateFormDefinition } from "@/lib/data/forms";

const { mockCreateServerDbClient } = vi.hoisted(() => ({ mockCreateServerDbClient: vi.fn() }));
vi.mock("@/lib/db/client", () => ({
  createServerDbClient: mockCreateServerDbClient,
  createServiceRoleDbClient: vi.fn(),
}));

beforeEach(() => {
  mockCreateServerDbClient.mockReset();
});

describe("getPublishedFormDefinitionByKey", () => {
  it("queries form_definitions filtered to the given key and status = published", async () => {
    const eqCalls: [string, unknown][] = [];
    const chain: Record<string, unknown> = {};
    chain.select = () => chain;
    chain.eq = (column: string, value: unknown) => {
      eqCalls.push([column, value]);
      return chain;
    };
    chain.maybeSingle = async () => ({ data: { id: "f1", form_key: "quote-request", status: "published" }, error: null });

    const fromCalls: string[] = [];
    mockCreateServerDbClient.mockReturnValue({
      from: (table: string) => {
        fromCalls.push(table);
        return chain;
      },
    });

    const result = await getPublishedFormDefinitionByKey("quote-request");

    expect(fromCalls).toEqual(["form_definitions"]);
    expect(eqCalls).toEqual([
      ["form_key", "quote-request"],
      ["status", "published"],
    ]);
    expect(result?.id).toBe("f1");
  });

  it("returns null when no published definition matches", async () => {
    const chain: Record<string, unknown> = {};
    chain.select = () => chain;
    chain.eq = () => chain;
    chain.maybeSingle = async () => ({ data: null, error: null });
    mockCreateServerDbClient.mockReturnValue({ from: () => chain });

    const result = await getPublishedFormDefinitionByKey("missing");
    expect(result).toBeNull();
  });
});

describe("createFormDefinition / updateFormDefinition", () => {
  it("createFormDefinition inserts into form_definitions and returns the created row", async () => {
    const insertedRows: unknown[] = [];
    const chain: Record<string, unknown> = {};
    chain.insert = (row: unknown) => {
      insertedRows.push(row);
      return chain;
    };
    chain.update = () => chain;
    chain.eq = () => chain;
    chain.select = () => chain;
    chain.single = async () => ({ data: { id: "f1", ...(insertedRows[0] as object) }, error: null });
    mockCreateServerDbClient.mockReturnValue({ from: () => chain });

    const result = await createFormDefinition({
      name: "Quote request",
      form_key: "quote-request",
      status: "draft",
      submit_label: "Submit",
      success_message: "Thanks!",
      notification_email: null,
      fields: [],
    });

    expect(insertedRows).toEqual([
      {
        name: "Quote request",
        form_key: "quote-request",
        status: "draft",
        submit_label: "Submit",
        success_message: "Thanks!",
        notification_email: null,
        fields: [],
      },
    ]);
    expect(result.id).toBe("f1");
  });

  it("updateFormDefinition updates the row by id", async () => {
    const eqCalls: [string, unknown][] = [];
    const chain: Record<string, unknown> = {};
    chain.update = () => chain;
    chain.eq = (column: string, value: unknown) => {
      eqCalls.push([column, value]);
      return chain;
    };
    chain.select = () => chain;
    chain.single = async () => ({ data: { id: "f1" }, error: null });
    mockCreateServerDbClient.mockReturnValue({ from: () => chain });

    await updateFormDefinition("f1", {
      name: "Quote request",
      form_key: "quote-request",
      status: "published",
      submit_label: "Submit",
      success_message: "Thanks!",
      notification_email: "sales@example.com",
      fields: [],
    });

    expect(eqCalls).toEqual([["id", "f1"]]);
  });
});
