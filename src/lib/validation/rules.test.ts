import { describe, it, expect } from "vitest";
import {
  checkDosenActive,
  checkSksCap,
  checkCrossProdi,
  checkSectionIntegrity,
  checkEmptyCourse,
} from "./rules";

describe("checkDosenActive", () => {
  it("returns an error for an inactive dosen", () => {
    const result = checkDosenActive({ kode: "ABC", aktif: false });
    expect(result).toMatchObject({ level: "error", code: "DOSEN_INACTIVE" });
  });

  it("returns null for an active dosen or no dosen (clearing)", () => {
    expect(checkDosenActive({ kode: "ABC", aktif: true })).toBeNull();
    expect(checkDosenActive(null)).toBeNull();
  });
});

describe("checkSksCap", () => {
  it("warns when the total exceeds the cap", () => {
    const result = checkSksCap("ABC", 19.5, 15);
    expect(result).toMatchObject({ level: "warning", code: "SKS_CAP_EXCEEDED" });
  });

  it("does not warn at or below the cap", () => {
    expect(checkSksCap("ABC", 15, 15)).toBeNull();
    expect(checkSksCap("ABC", 10, 15)).toBeNull();
  });

  it("uses the configured default cap when none is given", () => {
    const result = checkSksCap("ABC", 16);
    expect(result).not.toBeNull();
  });
});

describe("checkCrossProdi", () => {
  it("warns when the dosen's homebase differs from the target prodi", () => {
    const result = checkCrossProdi("ABC", "prodi-1", "prodi-2");
    expect(result).toMatchObject({ level: "warning", code: "CROSS_PRODI" });
  });

  it("does not warn for same-prodi or no homebase set", () => {
    expect(checkCrossProdi("ABC", "prodi-1", "prodi-1")).toBeNull();
    expect(checkCrossProdi("ABC", null, "prodi-1")).toBeNull();
  });
});

describe("checkSectionIntegrity", () => {
  it("errors when kodeKelas doesn't match prefix + suffix", () => {
    const result = checkSectionIntegrity("S1IF-10-99", "S1IF-10-", "01");
    expect(result).toMatchObject({ level: "error", code: "SECTION_INTEGRITY" });
  });

  it("passes when kodeKelas matches", () => {
    expect(checkSectionIntegrity("S1IF-10-01", "S1IF-10-", "01")).toBeNull();
  });
});

describe("checkEmptyCourse", () => {
  it("warns when a course has zero plotted sections", () => {
    const result = checkEmptyCourse("CAK4FAA4", 0);
    expect(result).toMatchObject({ level: "warning", code: "COURSE_NO_SECTIONS" });
  });

  it("does not warn when sections exist", () => {
    expect(checkEmptyCourse("CAK4FAA4", 1)).toBeNull();
  });
});
