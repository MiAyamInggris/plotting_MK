import { describe, it, expect } from "vitest";
import { classifyJfaGroup, computeProdiRatios, type DosenForRatio } from "./dosenRatios";

describe("classifyJfaGroup", () => {
  it("classifies all current jfaSchema values correctly", () => {
    expect(classifyJfaGroup("Asisten Ahli (150)")).toBe("AA");
    expect(classifyJfaGroup("Lektor (200)")).toBe("L");
    expect(classifyJfaGroup("Lektor (300)")).toBe("L");
    expect(classifyJfaGroup("Lektor Kepala (400)")).toBe("LK");
    expect(classifyJfaGroup("Lektor Kepala (550)")).toBe("LK");
    expect(classifyJfaGroup("NJFA")).toBe("NJFA");
  });

  it("classifies a Guru Besar value as GB even though it doesn't exist in the data today", () => {
    expect(classifyJfaGroup("Guru Besar (700)")).toBe("GB");
  });

  it("falls back to NJFA for null or unmapped values", () => {
    expect(classifyJfaGroup(null)).toBe("NJFA");
    expect(classifyJfaGroup("Something Unexpected")).toBe("NJFA");
  });
});

describe("computeProdiRatios", () => {
  it("counts distinct dosen via input length", () => {
    const dosen: DosenForRatio[] = [
      { jenis: "TETAP", tingkatPendidikan: "S2", jfa: "Lektor (200)" },
      { jenis: "TETAP", tingkatPendidikan: "S3", jfa: "Lektor Kepala (400)" },
      { jenis: "DLB", tingkatPendidikan: null, jfa: "NJFA" },
    ];
    const result = computeProdiRatios(dosen);
    expect(result.totalDosen).toBe(3);
  });

  it("splits dlb vs tetap correctly", () => {
    const dosen: DosenForRatio[] = [
      { jenis: "TETAP", tingkatPendidikan: "S2", jfa: null },
      { jenis: "TETAP", tingkatPendidikan: "S2", jfa: null },
      { jenis: "DLB", tingkatPendidikan: null, jfa: null },
    ];
    const result = computeProdiRatios(dosen);
    expect(result.dlbTetap).toEqual({ dlb: 1, tetap: 2 });
  });

  it("computes pendidikan over tetap only, mapping ON_GOING_S3 to sedangS3", () => {
    const dosen: DosenForRatio[] = [
      { jenis: "TETAP", tingkatPendidikan: "S2", jfa: null },
      { jenis: "TETAP", tingkatPendidikan: "S3", jfa: null },
      { jenis: "TETAP", tingkatPendidikan: "ON_GOING_S3", jfa: null },
      // A DLB row with a (data-error) non-null tingkatPendidikan must still
      // be excluded -- the exclusion is keyed on jenis, not on nullability.
      { jenis: "DLB", tingkatPendidikan: "S3", jfa: null },
    ];
    const result = computeProdiRatios(dosen);
    expect(result.pendidikan).toEqual({ s2: 1, s3: 1, sedangS3: 1 });
  });

  it("computes jfa groups over tetap only", () => {
    const dosen: DosenForRatio[] = [
      { jenis: "TETAP", tingkatPendidikan: "S2", jfa: "Asisten Ahli (150)" },
      { jenis: "TETAP", tingkatPendidikan: "S2", jfa: "Lektor (200)" },
      { jenis: "TETAP", tingkatPendidikan: "S2", jfa: "Lektor Kepala (400)" },
      // A DLB row with a (mandatory, per their form) jfa value must still be
      // excluded from the jfa breakdown.
      { jenis: "DLB", tingkatPendidikan: null, jfa: "Lektor (300)" },
    ];
    const result = computeProdiRatios(dosen);
    expect(result.jfa).toEqual({ AA: 1, L: 1, LK: 1, GB: 0, NJFA: 0 });
  });

  it("handles an empty list without error", () => {
    const result = computeProdiRatios([]);
    expect(result.totalDosen).toBe(0);
    expect(result.dlbTetap).toEqual({ dlb: 0, tetap: 0 });
  });
});
