import { describe, expect, it } from "vitest";
import { repairJoinedText } from "./repair-joined-text";

describe("repairJoinedText", () => {
  it("splits the joins found in the legacy HSE page", () => {
    expect(repairJoinedText("ISO 45001Health & Safety Management")).toBe("ISO 45001 Health & Safety Management");
    expect(repairJoinedText("ISO 9001Quality Management")).toBe("ISO 9001 Quality Management");
    expect(repairJoinedText("a safe workplace.Safety and excellence")).toBe("a safe workplace. Safety and excellence");
    expect(repairJoinedText("customer satisfaction.This achievement")).toBe("customer satisfaction. This achievement");
  });

  it("leaves correct text alone", () => {
    for (const ok of ["ISO 9001 Quality", "Odessa Separator Inc. (OSI)", "3M Company", "5G networks", "U.S.A. offices", "workplace. Safety"]) {
      expect(repairJoinedText(ok)).toBe(ok);
    }
  });
});
