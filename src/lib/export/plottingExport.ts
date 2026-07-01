import * as XLSX from "xlsx";
import type { SemesterPeriode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PRODI_SHEET_MAPPING } from "@/lib/import/prodiMapping";

type AoaCell = string | number | null;

// Reverse of PRODI_SHEET_MAPPING (kode -> sheet name).
const SHEET_NAME_BY_PRODI_KODE = new Map(
  Object.entries(PRODI_SHEET_MAPPING).map(([sheetName, kode]) => [kode, sheetName]),
);

// ─── Point 1: per-block pure helper ────────────────────────────────────────

type BlockRow = {
  kodeMK: string;
  nama: string;
  sks: number;
  ket: string | null;
  /** kodeKelas (full class code e.g. "REG01") → assigned dosen kode | null */
  kelasByCode: Map<string, string | null>;
};

export type BlockEntry = {
  semesterKe: number;
  tahunAngkatan: number;
  rows: BlockRow[];
};

/**
 * Builds the array-of-arrays rows for one semester block inside a prodi sheet.
 * Each class occupies exactly ONE column (full kodeKelas as header); the cell
 * value is the dosen kode or null if unplotted.  No repeated sks column per class.
 */
export function buildBlockAoa(block: BlockEntry): AoaCell[][] {
  const allCodes = new Set<string>();
  for (const row of block.rows) {
    for (const code of row.kelasByCode.keys()) allCodes.add(code);
  }
  const sortedCodes = [...allCodes].sort();

  const aoa: AoaCell[][] = [];

  aoa.push([`Semester ${block.semesterKe} | Tahun Angkatan ${block.tahunAngkatan}`]);

  const header: AoaCell[] = ["No.", "Kode MK", "Nama MK (Indonesia)", "sks", "Ket"];
  for (const code of sortedCodes) header.push(code);
  aoa.push(header);

  const sortedRows = [...block.rows].sort((a, b) => a.kodeMK.localeCompare(b.kodeMK));
  let no = 1;
  for (const row of sortedRows) {
    const line: AoaCell[] = [no++, row.kodeMK, row.nama, row.sks, row.ket];
    for (const code of sortedCodes) {
      line.push(row.kelasByCode.get(code) ?? null);
    }
    aoa.push(line);
  }

  aoa.push([]);
  return aoa;
}

// ─── Point 2: Rekap SKS per Dosen pure helper ──────────────────────────────

export type RekapDosenEntry = {
  kode: string;
  nama: string;
  jenis: string; // "TETAP" | "DLB"
  bebanStrukturalSks: number;
  bebanStruktural: string | null;
  grandTotal: number; // totalSksPengajaran + bebanStrukturalSks
  totalKelas: number;
  totalSksPengajaran: number;
  groups: {
    prodiKode: string;
    semesterKe: number;
    tahunAngkatan: number;
    jumlahKelas: number;
    totalSks: number;
  }[];
};

/**
 * Builds the array-of-arrays for the "Rekap SKS per Dosen" sheet.
 * One detail row per (dosen × prodi × semester); subtotal + struktural + grand
 * total rows appended per dosen; sorted by grand total SKS descending.
 */
export function buildRekapAoa(dosenList: RekapDosenEntry[]): AoaCell[][] {
  const aoa: AoaCell[][] = [
    ["Kode Dosen", "Nama Dosen", "Jenis", "Prodi", "Semester", "Jumlah Kelas", "Total SKS"],
  ];

  const sorted = [...dosenList].sort((a, b) => b.grandTotal - a.grandTotal);

  for (const d of sorted) {
    for (const g of d.groups) {
      aoa.push([
        d.kode,
        d.nama,
        d.jenis === "DLB" ? "DLB" : "Tetap",
        g.prodiKode,
        `Sem ${g.semesterKe} · Angkatan ${g.tahunAngkatan}`,
        g.jumlahKelas,
        g.totalSks,
      ]);
    }
    // Subtotal row (teaching only)
    aoa.push([
      d.kode,
      `${d.nama} — Subtotal Pengajaran`,
      null,
      null,
      null,
      d.totalKelas,
      d.totalSksPengajaran,
    ]);
    // Struktural row (only when non-zero)
    if (d.bebanStrukturalSks > 0) {
      aoa.push([
        d.kode,
        `+ Beban Struktural: ${d.bebanStruktural ?? "–"}`,
        null,
        null,
        null,
        null,
        d.bebanStrukturalSks,
      ]);
    }
    // Grand total row
    aoa.push([
      d.kode,
      `${d.nama} — Total Beban`,
      null,
      null,
      null,
      null,
      d.grandTotal,
    ]);
    // Blank separator between dosen
    aoa.push([]);
  }

  return aoa;
}

// ─── Main export function ────────────────────────────────────────────────────

export async function exportPlottingWorkbook(activePeriode: SemesterPeriode): Promise<Buffer> {
  const programStudiList = await prisma.programStudi.findMany({ orderBy: { kode: "asc" } });
  const wb = XLSX.utils.book_new();

  for (const prodi of programStudiList) {
    const mataKuliah = await prisma.mataKuliah.findMany({
      where: { prodiId: prodi.id },
      orderBy: { kodeMK: "asc" },
      include: {
        courseOfferings: {
          where: { semesterPeriodeId: activePeriode.id },
          include: {
            kelas: {
              orderBy: { kodeKelas: "asc" },
              include: { dosen: { select: { kode: true } } },
            },
          },
        },
      },
    });

    const blocks = new Map<string, BlockEntry>();

    for (const mk of mataKuliah) {
      for (const co of mk.courseOfferings) {
        const key = `${co.semesterKe}|${co.tahunAngkatan}`;
        if (!blocks.has(key)) {
          blocks.set(key, { semesterKe: co.semesterKe, tahunAngkatan: co.tahunAngkatan, rows: [] });
        }
        const block = blocks.get(key)!;
        const kelasByCode = new Map<string, string | null>(
          co.kelas.map((k) => [k.kodeKelas, k.dosen?.kode ?? null]),
        );
        block.rows.push({ kodeMK: mk.kodeMK, nama: mk.nama, sks: mk.sks, ket: mk.ket, kelasByCode });
      }
    }

    const aoa: AoaCell[][] = [
      ["Program Studi", null, `: ${prodi.nama}`],
      ["Semester", null, `: ${activePeriode.nama}`],
      [],
    ];

    const sortedBlocks = [...blocks.values()].sort(
      (a, b) => b.semesterKe - a.semesterKe || a.tahunAngkatan - b.tahunAngkatan,
    );

    for (const block of sortedBlocks) {
      aoa.push(...buildBlockAoa(block));
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const sheetName = (SHEET_NAME_BY_PRODI_KODE.get(prodi.kode) ?? prodi.kode).slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  await appendRekapSheet(wb, activePeriode);

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return buffer;
}

async function appendRekapSheet(wb: XLSX.WorkBook, activePeriode: SemesterPeriode): Promise<void> {
  const assignedKelas = await prisma.kelas.findMany({
    where: { semesterPeriodeId: activePeriode.id, dosenId: { not: null } },
    select: {
      sks: true,
      dosenId: true,
      courseOffering: {
        select: {
          semesterKe: true,
          tahunAngkatan: true,
          prodi: { select: { kode: true } },
        },
      },
    },
  });

  const allDosen = await prisma.dosen.findMany({
    where: { aktif: true },
    select: {
      id: true,
      kode: true,
      nama: true,
      jenis: true,
      bebanStrukturalSks: true,
      bebanStruktural: true,
    },
  });

  const dosenById = new Map(allDosen.map((d) => [d.id, d]));

  type DosenAgg = {
    kode: string;
    nama: string;
    jenis: string;
    bebanStrukturalSks: number;
    bebanStruktural: string | null;
    totalSksPengajaran: number;
    totalKelas: number;
    groups: Map<
      string,
      { prodiKode: string; semesterKe: number; tahunAngkatan: number; jumlahKelas: number; totalSks: number }
    >;
  };

  const byDosen = new Map<string, DosenAgg>();

  for (const k of assignedKelas) {
    if (!k.dosenId) continue;
    const d = dosenById.get(k.dosenId);
    if (!d) continue;

    let agg = byDosen.get(k.dosenId);
    if (!agg) {
      agg = {
        kode: d.kode,
        nama: d.nama,
        jenis: d.jenis,
        bebanStrukturalSks: d.bebanStrukturalSks ?? 0,
        bebanStruktural: d.bebanStruktural,
        totalSksPengajaran: 0,
        totalKelas: 0,
        groups: new Map(),
      };
      byDosen.set(k.dosenId, agg);
    }

    agg.totalSksPengajaran += k.sks;
    agg.totalKelas += 1;

    const { semesterKe, tahunAngkatan, prodi } = k.courseOffering;
    const groupKey = `${prodi.kode}|${semesterKe}|${tahunAngkatan}`;
    const g = agg.groups.get(groupKey) ?? {
      prodiKode: prodi.kode,
      semesterKe,
      tahunAngkatan,
      jumlahKelas: 0,
      totalSks: 0,
    };
    g.jumlahKelas += 1;
    g.totalSks += k.sks;
    agg.groups.set(groupKey, g);
  }

  const entries: RekapDosenEntry[] = [...byDosen.values()].map((agg) => ({
    kode: agg.kode,
    nama: agg.nama,
    jenis: agg.jenis,
    bebanStrukturalSks: agg.bebanStrukturalSks,
    bebanStruktural: agg.bebanStruktural,
    grandTotal: agg.totalSksPengajaran + agg.bebanStrukturalSks,
    totalKelas: agg.totalKelas,
    totalSksPengajaran: agg.totalSksPengajaran,
    groups: [...agg.groups.values()].sort(
      (a, b) =>
        a.prodiKode.localeCompare(b.prodiKode) ||
        a.semesterKe - b.semesterKe ||
        a.tahunAngkatan - b.tahunAngkatan,
    ),
  }));

  const aoa = buildRekapAoa(entries);
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  XLSX.utils.book_append_sheet(wb, ws, "Rekap SKS per Dosen");
}
