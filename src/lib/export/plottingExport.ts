import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { PRODI_SHEET_MAPPING } from "@/lib/import/prodiMapping";

type AoaCell = string | number | null;

// Reverse of PRODI_SHEET_MAPPING (kode -> sheet name). For most prodi the
// sheet name equals the kode, but a few (TT_S1, TT_S1_AJ, TT_D3) differ —
// using the wrong name here would make the exported file fail to round-trip
// through our own importer.
const SHEET_NAME_BY_PRODI_KODE = new Map(
  Object.entries(PRODI_SHEET_MAPPING).map(([sheetName, kode]) => [kode, sheetName]),
);

export async function exportPlottingWorkbook(): Promise<Buffer> {
  const activePeriode = await prisma.semesterPeriode.findFirst({ where: { aktif: true } });
  if (!activePeriode) {
    throw new Error("No active SemesterPeriode is configured");
  }

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
              orderBy: { sectionSuffix: "asc" },
              include: { dosen: { select: { kode: true } } },
            },
          },
        },
      },
    });

    type BlockRow = {
      kodeMK: string;
      nama: string;
      sks: number;
      ket: string | null;
      kelasBySuffix: Map<string, { sks: number; dosenKode: string | null }>;
    };
    const blocks = new Map<
      string,
      { semesterKe: number; tahunAngkatan: number; kelasPrefix: string; rows: BlockRow[] }
    >();

    for (const mk of mataKuliah) {
      for (const co of mk.courseOfferings) {
        const key = `${co.semesterKe}|${co.tahunAngkatan}`;
        const block = blocks.get(key) ?? {
          semesterKe: co.semesterKe,
          tahunAngkatan: co.tahunAngkatan,
          kelasPrefix: co.kelasPrefix,
          rows: [],
        };
        const kelasBySuffix = new Map(
          co.kelas.map((k) => [k.sectionSuffix, { sks: k.sks, dosenKode: k.dosen?.kode ?? null }]),
        );
        block.rows.push({ kodeMK: mk.kodeMK, nama: mk.nama, sks: mk.sks, ket: mk.ket, kelasBySuffix });
        blocks.set(key, block);
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
      const suffixes = new Set<string>();
      for (const row of block.rows) {
        for (const suffix of row.kelasBySuffix.keys()) suffixes.add(suffix);
      }
      const suffixList = [...suffixes].sort();

      aoa.push([
        `Semester ${block.semesterKe} | Tahun Angkatan ${block.tahunAngkatan}`,
        null,
        null,
        null,
        null,
        `Pengampu (kode Dosen) kelas ${block.kelasPrefix}`,
      ]);

      const sectionHeader: AoaCell[] = ["No.", "Kode MK", "Nama MK (Indonesia)", "sks", "Ket"];
      for (const suffix of suffixList) sectionHeader.push(suffix, "sks");
      aoa.push(sectionHeader);

      block.rows.sort((a, b) => a.kodeMK.localeCompare(b.kodeMK));
      let no = 1;
      for (const row of block.rows) {
        const line: AoaCell[] = [no++, row.kodeMK, row.nama, row.sks, row.ket];
        for (const suffix of suffixList) {
          const k = row.kelasBySuffix.get(suffix);
          if (k?.dosenKode) {
            line.push(k.dosenKode, k.sks);
          } else {
            line.push(null, null);
          }
        }
        aoa.push(line);
      }
      aoa.push([]);
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const sheetName = (SHEET_NAME_BY_PRODI_KODE.get(prodi.kode) ?? prodi.kode).slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return buffer;
}
