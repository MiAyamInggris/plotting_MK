import { describe, it, expect } from "vitest";
import { deriveDefaultPassword } from "./dosenAccounts";

describe("deriveDefaultPassword", () => {
  it("truncates at the first dash", () => {
    expect(deriveDefaultPassword("19910017-1")).toBe("19910017");
  });

  it("returns the NIP unchanged when there's no dash", () => {
    expect(deriveDefaultPassword("25000021")).toBe("25000021");
  });

  it("truncates at the first dash only, even with multiple dashes", () => {
    expect(deriveDefaultPassword("19910017-1-A")).toBe("19910017");
  });
});
