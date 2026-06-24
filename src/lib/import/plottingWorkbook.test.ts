import { describe, it, expect } from "vitest";
import { parseSheetBlocks } from "./plottingWorkbook";
import type { ImportWarning } from "./types";

function row(...cells: (string | number | null)[]): unknown[] {
  return cells;
}

describe("parseSheetBlocks", () => {
  it("detects a block and parses bare-suffix (IF-style) sections", () => {
    const rows = [
      row("Program Studi", null, ": S1 Teknik Informatika"),
      row("Semester", null, ": Ganjil 2025/2026"),
      row(),
      row("Semester 7 | Tahun Angkatan 2022", null, null, null, null, "Pengampu (kode Dosen) kelas S1IF-10-"),
      row("No.", "Kode MK", "Nama MK (Indonesia)", "sks", "Ket", "01", "sks", "02", "sks"),
      row("1", "CAK4FAA4", "Tugas Akhir", "4", "Prodi", "ADN", "0"),
      row(),
    ];
    const warnings: ImportWarning[] = [];
    const blocks = parseSheetBlocks("IF", rows, warnings);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ semesterKe: 7, tahunAngkatan: 2022, kelasPrefix: "S1IF-10-" });
    expect(blocks[0].courses).toHaveLength(1);
    expect(blocks[0].courses[0]).toMatchObject({ kodeMK: "CAK4FAA4", sks: 4 });
    expect(blocks[0].courses[0].kelas).toEqual([
      { sectionSuffix: "01", kodeKelas: "S1IF-10-01", sks: 0, dosenKode: "ADN" },
    ]);
  });

  it("parses full-code (SI-style) sections without needing a label prefix", () => {
    const rows = [
      row("Semester 7 | Tahun Angkatan 2022", null, null, null, null, "Pengampu (kode Dosen)"),
      row("No.", "Kode MK", "Nama MK", null, "Ket", "S1SI-06-A", "SKS", "S1SI-06-B", "SKS"),
      row("1", "BBK3AAB3", "Arsitektur Enterprise", null, null, "MAW", "3", "SFR", "3"),
    ];
    const blocks = parseSheetBlocks("SI", rows, []);

    expect(blocks[0].kelasPrefix).toBe("S1SI-06-");
    expect(blocks[0].courses[0].kelas).toEqual([
      { sectionSuffix: "A", kodeKelas: "S1SI-06-A", sks: 3, dosenKode: "MAW" },
      { sectionSuffix: "B", kodeKelas: "S1SI-06-B", sks: 3, dosenKode: "SFR" },
    ]);
    // base sks was blank; falls back to a section's sks
    expect(blocks[0].courses[0].sks).toBe(3);
  });

  it("treats a blank section-sks cell as 0, not a fallback to base sks", () => {
    // Regression: a dosen assigned with no per-section sks (e.g. Kerja Praktik
    // supervision) must contribute 0, matching the source's own load totals —
    // not the course's base sks.
    const rows = [
      row("Semester 7 | Tahun Angkatan 2022", null, null, null, null, "Pengampu (kode Dosen) kelas SE-06-"),
      row("No.", "Kode MK", "Nama MK", "SKS", "Ket", "01", "sks"),
      row("1", "CCK4BAB3", "Kerja Praktik", "3", "Eksepsi", "ARB", null),
    ];
    const blocks = parseSheetBlocks("SE", rows, []);
    expect(blocks[0].courses[0].kelas).toEqual([
      { sectionSuffix: "01", kodeKelas: "SE-06-01", sks: 0, dosenKode: "ARB" },
    ]);
  });

  it("disambiguates a Kode MK that repeats within a block instead of overwriting the earlier occurrence", () => {
    // Regression: MBKM-style sheets reuse a generic Kode MK across distinct
    // activities ("Magang 1", "Magang 2"). Without disambiguation both rows
    // resolve to the same CourseOffering+Kelas and one assignment is lost.
    const rows = [
      row("Semester 1 | Tahun Angkatan 2025", null, null, null, null, "Pengampu (kode Dosen) kelas D3TB-"),
      row("No.", "Kode MK", "Nama MK", "sks", "Ket", "01", "sks"),
      row("8", "UHKXAEB5", "Merdeka Belajar - Magang 1", "5", null, "AWP", "5"),
      row("9", "UHKXAEB5", "Merdeka Belajar - Magang 2", "5", null, "AWP", "5"),
    ];
    const warnings: ImportWarning[] = [];
    const blocks = parseSheetBlocks("TB", rows, warnings);

    expect(blocks[0].courses).toHaveLength(2);
    const suffixes = blocks[0].courses.flatMap((c) => c.kelas.map((k) => k.sectionSuffix));
    expect(new Set(suffixes).size).toBe(2); // distinct, not collapsed
    expect(suffixes).toEqual(["01", "01~2"]);
    expect(warnings.some((w) => w.message.includes("repeats within this block"))).toBe(true);
  });

  it("disambiguates a duplicate section-suffix label within the same block", () => {
    // Regression: two header columns both labeled "S1TI-08-A" would
    // otherwise collapse into a single Kelas and silently drop one dosen's
    // contribution (found via reconciliation against the source totals).
    const rows = [
      row("Semester 3 | Tahun Angkatan 2024", null, null, null, null, "Pengampu (kode Dosen) kelas S1TI-08-"),
      row("No.", "Kode MK", "Nama MK", "SKS", "Ket", "S1TI-08-A", "SKS", "S1TI-08-A", "SKS", "S1TI-08-C", "SKS"),
      row("1", "BAK2CAB3", "Kalkulus 3", "3", null, "RDO", "3", "RDO", "3", "RDO", "3"),
    ];
    const warnings: ImportWarning[] = [];
    const blocks = parseSheetBlocks("TI", rows, warnings);

    expect(blocks[0].courses[0].kelas).toHaveLength(3);
    const totalSks = blocks[0].courses[0].kelas.reduce((sum, k) => sum + k.sks, 0);
    expect(totalSks).toBe(9);
    expect(warnings.some((w) => w.message.includes("Duplicate section suffix"))).toBe(true);
  });

  it("stops a block at its totals footer instead of reading unrelated trailing content", () => {
    // Regression: some sheets append a roster (e.g. "Dosen Luar Biasa") right
    // after a block's "Jumlah SKS per kelas" footer, within the same scanned
    // row range as the last block.
    const rows = [
      row("Semester 1 | Tahun Angkatan 2025", null, null, null, null, "Pengampu (kode Dosen) kelas S1BD-02-"),
      row("No.", "Kode MK", "Nama MK", "SKS", "Ket", "01", "sks"),
      row("1", "DDK1AAB3", "Pengantar Akuntansi", "3", null, "AAH", "3"),
      row("Jumlah SKS per kelas", null, null, null, null, null, "3"),
      row(null, "Kode", "Nama Dosen"),
      row(null, "IST", "Dr. Irwan Susanto"),
    ];
    const blocks = parseSheetBlocks("BD", rows, []);
    expect(blocks[0].courses).toHaveLength(1);
    expect(blocks[0].courses[0].kodeMK).toBe("DDK1AAB3");
  });

  it("skips a category sub-header placed in the Kode MK column", () => {
    const rows = [
      row("Semester 7 | Tahun Angkatan 2022", null, null, null, null, "Pengampu (kode Dosen)"),
      row("No.", "Kode MK", "Nama MK", "SKS", "Ket", "01", "SKS"),
      row(null, "Pilihan MBKM", null, null, null, null, null),
      row("5", "CCK4NBB3", "Magang Pengujian Perangkat Lunak", "3", "WRAP", "YIS", "3"),
    ];
    const blocks = parseSheetBlocks("SE", rows, []);
    expect(blocks[0].courses).toHaveLength(1);
    expect(blocks[0].courses[0].kodeMK).toBe("CCK4NBB3");
  });

  it("leaves a section unassigned when the dosen cell is blank", () => {
    const rows = [
      row("Semester 7 | Tahun Angkatan 2022", null, null, null, null, "Pengampu (kode Dosen) kelas S1IF-10-"),
      row("No.", "Kode MK", "Nama MK", "sks", "Ket", "01", "sks", "02", "sks"),
      row("1", "CAK4CAC3", "Computing Project", "3", null, "ABX", "3", null, null),
    ];
    const blocks = parseSheetBlocks("IF", rows, []);
    expect(blocks[0].courses[0].kelas).toHaveLength(1);
    expect(blocks[0].courses[0].kelas[0].dosenKode).toBe("ABX");
  });

  it("returns no blocks and a warning when no semester header is found", () => {
    const warnings: ImportWarning[] = [];
    const blocks = parseSheetBlocks("EMPTY", [row("just some text")], warnings);
    expect(blocks).toEqual([]);
    expect(warnings).toHaveLength(1);
  });
});
