import { describe, expect, it, vi, beforeEach } from "vitest";
import { countDraftsAwaitingPublication } from "@/lib/data/dashboard";

const { mockCreateServerDbClient } = vi.hoisted(() => ({ mockCreateServerDbClient: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ createServerDbClient: mockCreateServerDbClient }));

function fakeDb(counts: Record<string, number | null>, errors: Record<string, unknown> = {}) {
  return {
    from: (table: string) => ({
      select: () => ({
        eq: () => Promise.resolve({ count: counts[table] ?? 0, error: errors[table] ?? null }),
      }),
    }),
  };
}

describe("countDraftsAwaitingPublication", () => {
  beforeEach(() => mockCreateServerDbClient.mockReset());

  it("sums draft counts across pages, products, shared_sections, and form_definitions", async () => {
    mockCreateServerDbClient.mockReturnValue(
      fakeDb({ pages: 3, products: 1, shared_sections: 0, form_definitions: 2 }),
    );
    const result = await countDraftsAwaitingPublication();
    expect(result).toEqual({ pages: 3, products: 1, sharedSections: 0, forms: 2, total: 6 });
  });

  it("treats a null count as 0", async () => {
    mockCreateServerDbClient.mockReturnValue(
      fakeDb({ pages: null, products: null, shared_sections: null, form_definitions: null }),
    );
    expect(await countDraftsAwaitingPublication()).toEqual({
      pages: 0,
      products: 0,
      sharedSections: 0,
      forms: 0,
      total: 0,
    });
  });

  it("throws if any one of the four queries errors", async () => {
    mockCreateServerDbClient.mockReturnValue(
      fakeDb({ pages: 1, products: 1, shared_sections: 1, form_definitions: 1 }, { products: new Error("boom") }),
    );
    await expect(countDraftsAwaitingPublication()).rejects.toThrow("boom");
  });
});
