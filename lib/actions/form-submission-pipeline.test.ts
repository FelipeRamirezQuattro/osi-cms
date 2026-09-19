import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCookiesGet, mockHeadersGet } = vi.hoisted(() => ({
  mockCookiesGet: vi.fn(),
  mockHeadersGet: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: mockCookiesGet }),
  headers: async () => ({ get: mockHeadersGet }),
}));

const { mockCountRecentSubmissionsByIp, mockInsertFormSubmission } = vi.hoisted(() => ({
  mockCountRecentSubmissionsByIp: vi.fn(),
  mockInsertFormSubmission: vi.fn(),
}));

vi.mock("@/lib/data/forms", () => ({
  countRecentSubmissionsByIp: mockCountRecentSubmissionsByIp,
  insertFormSubmission: mockInsertFormSubmission,
}));

import { processFormSubmission } from "@/lib/actions/form-submission-pipeline";

describe("processFormSubmission", () => {
  beforeEach(() => {
    mockCookiesGet.mockReset().mockReturnValue(undefined);
    mockHeadersGet.mockReset().mockReturnValue(null);
    mockCountRecentSubmissionsByIp.mockReset().mockResolvedValue(0);
    mockInsertFormSubmission.mockReset().mockResolvedValue({ error: null });
  });

  it("attributes the submission to the visitor's existing analytics session/visitor cookies", async () => {
    mockCookiesGet.mockImplementation((name: string) => {
      if (name === "osi_sid") return { value: "session-123" };
      if (name === "osi_vid") return { value: "visitor-456" };
      return undefined;
    });

    await processFormSubmission({
      formKey: "contact",
      pageSlug: "contact",
      payload: { message: "hi" },
      honeypotTripped: false,
      notify: async () => {},
    });

    expect(mockInsertFormSubmission).toHaveBeenCalledWith(
      expect.objectContaining({ session_id: "session-123", visitor_id: "visitor-456" }),
    );
  });

  it("submits null session/visitor ids when the visitor has no analytics cookies", async () => {
    await processFormSubmission({
      formKey: "contact",
      pageSlug: "contact",
      payload: { message: "hi" },
      honeypotTripped: false,
      notify: async () => {},
    });

    expect(mockInsertFormSubmission).toHaveBeenCalledWith(
      expect.objectContaining({ session_id: null, visitor_id: null }),
    );
  });
});
