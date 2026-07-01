import { describe, it, expect } from "vitest";
import { buildBlockAoa, buildRekapAoa, type BlockEntry, type RekapDosenEntry } from "./plottingExport";

describe("buildBlockAoa — Point 1: class-code columns", () => {
  it("uses full kodeKelas as column headers (no suffix+sks pairs)", () => {
    const block: BlockEntry = {
      semesterKe: 5,
      tahunAngkatan: 2024,
      rows: [
        {
          kodeMK: "CCK12345",
          nama: "Testing MK 1",
          sks: 3,
          ket: "TESTING MK",
          kelasByCode: new Map([["REG01", "PRX"], ["REG02", null], ["REG03", "PRX"]]),
        },
      ],
    };
    const aoa = buildBlockAoa(block);

    const header = aoa.find((row) => row[0] === "No.");
    expect(header).toEqual(["No.", "Kode MK", "Nama MK (Indonesia)", "sks", "Ket", "REG01", "REG02", "REG03"]);
    // "sks" appears exactly once (the MK sks column) — no per-class sks repeat
    expect(header!.filter((c) => c === "sks")).toHaveLength(1);
  });

  it("data row: dosen kode in plotted column, null in unplotted column", () => {
    const block: BlockEntry = {
      semesterKe: 5,
      tahunAngkatan: 2024,
      rows: [
        {
          kodeMK: "CCK12345",
          nama: "Testing MK 1",
          sks: 3,
          ket: "TESTING MK",
          kelasByCode: new Map([["REG01", "PRX"], ["REG02", null], ["REG03", "PRX"]]),
        },
      ],
    };
    const aoa = buildBlockAoa(block);
    const dataRow = aoa.find((row) => row[1] === "CCK12345");
    expect(dataRow).toEqual([1, "CCK12345", "Testing MK 1", 3, "TESTING MK", "PRX", null, "PRX"]);
  });

  it("MK not offered in a class column gets null in that column", () => {
    const block: BlockEntry = {
      semesterKe: 3,
      tahunAngkatan: 2023,
      rows: [
        { kodeMK: "A001", nama: "Alpha", sks: 2, ket: null, kelasByCode: new Map([["S1IF-01", "AAA"]]) },
        { kodeMK: "B002", nama: "Beta", sks: 3, ket: null, kelasByCode: new Map([["S1IF-02", "BBB"]]) },
      ],
    };
    const aoa = buildBlockAoa(block);
    const header = aoa.find((row) => row[0] === "No.");
    expect(header).toEqual(["No.", "Kode MK", "Nama MK (Indonesia)", "sks", "Ket", "S1IF-01", "S1IF-02"]);

    const alpha = aoa.find((row) => row[1] === "A001");
    expect(alpha![5]).toBe("AAA"); // S1IF-01 column
    expect(alpha![6]).toBeNull();  // S1IF-02 — not offered

    const beta = aoa.find((row) => row[1] === "B002");
    expect(beta![5]).toBeNull();   // S1IF-01 — not offered
    expect(beta![6]).toBe("BBB"); // S1IF-02 column
  });

  it("rows are sorted by kodeMK ascending", () => {
    const block: BlockEntry = {
      semesterKe: 1,
      tahunAngkatan: 2024,
      rows: [
        { kodeMK: "ZZZ", nama: "Last", sks: 2, ket: null, kelasByCode: new Map([["K1", "X"]]) },
        { kodeMK: "AAA", nama: "First", sks: 3, ket: null, kelasByCode: new Map([["K1", "Y"]]) },
      ],
    };
    const aoa = buildBlockAoa(block);
    const dataRows = aoa.filter((row) => typeof row[0] === "number");
    expect(dataRows[0][1]).toBe("AAA");
    expect(dataRows[1][1]).toBe("ZZZ");
  });
});

describe("buildRekapAoa — Point 2: Rekap SKS per Dosen", () => {
  it("first row is the header row", () => {
    const aoa = buildRekapAoa([]);
    expect(aoa[0]).toContain("Kode Dosen");
    expect(aoa[0]).toContain("Nama Dosen");
    expect(aoa[0]).toContain("Jenis");
    expect(aoa[0]).toContain("Total SKS");
  });

  it("subtotal and grand total per dosen match their components", () => {
    const entry: RekapDosenEntry = {
      kode: "RAD",
      nama: "Rifki Adhitama",
      jenis: "TETAP",
      bebanStrukturalSks: 3,
      bebanStruktural: "Kepala KK",
      grandTotal: 9,
      totalKelas: 2,
      totalSksPengajaran: 6,
      groups: [{ prodiKode: "IF", semesterKe: 5, tahunAngkatan: 2024, jumlahKelas: 2, totalSks: 6 }],
    };
    const aoa = buildRekapAoa([entry]);

    // Detail row
    const detail = aoa.find((row) => row[0] === "RAD" && row[3] === "IF");
    expect(detail![5]).toBe(2); // jumlahKelas
    expect(detail![6]).toBe(6); // totalSks

    // Subtotal row
    const subtotal = aoa.find((row) => String(row[1]).includes("Subtotal"));
    expect(subtotal![5]).toBe(2); // totalKelas
    expect(subtotal![6]).toBe(6); // totalSksPengajaran

    // Struktural row
    const struktural = aoa.find((row) => String(row[1]).includes("Struktural"));
    expect(struktural![6]).toBe(3);

    // Grand total row = teaching (6) + struktural (3)
    const grandTotal = aoa.find((row) => String(row[1]).includes("Total Beban"));
    expect(grandTotal![6]).toBe(9);
  });

  it("omits struktural row when bebanStrukturalSks is 0", () => {
    const entry: RekapDosenEntry = {
      kode: "BDI",
      nama: "Budi",
      jenis: "DLB",
      bebanStrukturalSks: 0,
      bebanStruktural: null,
      grandTotal: 6,
      totalKelas: 2,
      totalSksPengajaran: 6,
      groups: [{ prodiKode: "SE", semesterKe: 3, tahunAngkatan: 2023, jumlahKelas: 2, totalSks: 6 }],
    };
    const aoa = buildRekapAoa([entry]);
    expect(aoa.some((row) => String(row[1]).includes("Struktural"))).toBe(false);
  });

  it("sorts dosen by grand total SKS descending", () => {
    const entries: RekapDosenEntry[] = [
      {
        kode: "LOW", nama: "Low SKS", jenis: "TETAP",
        bebanStrukturalSks: 0, bebanStruktural: null,
        grandTotal: 3, totalKelas: 1, totalSksPengajaran: 3,
        groups: [{ prodiKode: "IF", semesterKe: 1, tahunAngkatan: 2024, jumlahKelas: 1, totalSks: 3 }],
      },
      {
        kode: "HIGH", nama: "High SKS", jenis: "TETAP",
        bebanStrukturalSks: 0, bebanStruktural: null,
        grandTotal: 12, totalKelas: 4, totalSksPengajaran: 12,
        groups: [{ prodiKode: "SE", semesterKe: 3, tahunAngkatan: 2023, jumlahKelas: 4, totalSks: 12 }],
      },
    ];
    const aoa = buildRekapAoa(entries);
    const highIdx = aoa.findIndex((row) => row[0] === "HIGH");
    const lowIdx = aoa.findIndex((row) => row[0] === "LOW");
    expect(highIdx).toBeGreaterThan(0); // not the header
    expect(highIdx).toBeLessThan(lowIdx);
  });

  it("DLB dosen shows 'DLB' in jenis column", () => {
    const entry: RekapDosenEntry = {
      kode: "DLB1", nama: "DLB Dosen", jenis: "DLB",
      bebanStrukturalSks: 0, bebanStruktural: null,
      grandTotal: 3, totalKelas: 1, totalSksPengajaran: 3,
      groups: [{ prodiKode: "TE", semesterKe: 2, tahunAngkatan: 2024, jumlahKelas: 1, totalSks: 3 }],
    };
    const aoa = buildRekapAoa([entry]);
    const detail = aoa.find((row) => row[0] === "DLB1" && row[3] === "TE");
    expect(detail![2]).toBe("DLB");
  });
});
