import { describe, it, expect } from "vitest";
import { parseFlexibleDate, isBlankDateMarker } from "./excelDate";

describe("parseFlexibleDate", () => {
  it("parses DD/MM/YYYY", () => {
    const d = parseFlexibleDate("01/12/2023");
    expect(d?.toISOString()).toBe("2023-12-01T00:00:00.000Z");
  });

  it("parses 'D Month YYYY' with English or Indonesian month names", () => {
    expect(parseFlexibleDate("1 July 2023")?.toISOString()).toBe("2023-07-01T00:00:00.000Z");
    expect(parseFlexibleDate("1 Oktober 2023")?.toISOString()).toBe("2023-10-01T00:00:00.000Z");
  });

  it("returns null for the '-' placeholder, blank, and garbage input", () => {
    expect(parseFlexibleDate("-")).toBeNull();
    expect(parseFlexibleDate("")).toBeNull();
    expect(parseFlexibleDate(null)).toBeNull();
    expect(parseFlexibleDate("not a date")).toBeNull();
  });
});

describe("isBlankDateMarker", () => {
  it("recognizes '-' as an intentional blank, not a parsing error", () => {
    expect(isBlankDateMarker("-")).toBe(true);
    expect(isBlankDateMarker(" - ")).toBe(true);
    expect(isBlankDateMarker("01/12/2023")).toBe(false);
  });
});
