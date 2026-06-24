import * as XLSX from "xlsx";
import type { Prisma, TingkatPendidikan } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isBlankDateMarker, parseFlexibleDate } from "./excelDate";
import { HOMEBASE_PRODI_MAPPING } from "./prodiMapping";
import { IMPORT_AUTO_CREATE_UNKNOWN_LOOKUPS } from "@/lib/config";
import type { ImportReport, ImportWarning } from "./types";

const KNOWN_JFA = new Set([
  "Asisten Ahli (150)",
  "Lektor (200)",
  "Lektor (300)",
  "Lektor Kepala (400)",
  "Lektor Kepala (550)",
  "NJFA",
]);

function cell(row: unknown[], i: number): string | null {
  const v = row[i];
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

function parseTingkatPendidikan(
  raw: string | null,
  kode: string,
  warnings: ImportWarning[],
  rowNum: number,
): TingkatPendidikan | null {
  if (!raw) return null;
  if (raw === "S2") return "S2";
  if (raw === "S3") return "S3";
  if (raw === "ON GOING S3") return "ON_GOING_S3";
  warnings.push({
    level: "warning",
    message: `Unrecognized Tingkat Pendidikan "${raw}" for dosen ${kode}`,
    context: `DOSEN row ${rowNum}`,
  });
  return null;
}

export async function importDosenMaster(buffer: Buffer): Promise<ImportReport> {
  const warnings: ImportWarning[] = [];
  const counts = { dosenCreated: 0, dosenUpdated: 0, coeCreated: 0 };

  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets["DOSEN"];
  if (!ws) {
    throw new Error('Sheet "DOSEN" not found in the dosen master workbook');
  }

  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    raw: false,
    defval: null,
  });

  const [programStudiList, kkList, existingDosenKodes, coeList] = await Promise.all([
    prisma.programStudi.findMany(),
    prisma.kelompokKeahlian.findMany(),
    prisma.dosen.findMany({ select: { kode: true } }),
    prisma.centerOfExcellence.findMany(),
  ]);

  const prodiByKode = new Map(programStudiList.map((p) => [p.kode, p.id]));
  const kkByNama = new Map(kkList.map((k) => [k.nama, k.id]));
  const existingKodeSet = new Set(existingDosenKodes.map((d) => d.kode));
  const coeIdByNama = new Map(coeList.map((c) => [c.nama, c.id]));

  type DosenRow = {
    rowNum: number;
    kode: string;
    data: Prisma.DosenUpsertArgs["create"];
  };
  const toUpsert: DosenRow[] = [];

  // Header is on spreadsheet row 2 (index 1); data starts row 3 (index 2).
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const kode = cell(row, 5)?.toUpperCase() ?? null;
    if (!kode) continue;

    const rowNum = i + 1;
    const nama = cell(row, 1) ?? "";
    const namaTanpaGelar = cell(row, 2) ?? "";
    const nipYpt = cell(row, 3);
    const nidn = cell(row, 4);
    const jfaRaw = cell(row, 6);
    const tmtJfaRaw = cell(row, 7);
    const homebaseRaw = cell(row, 8);
    const tingkatRaw = cell(row, 9);
    const kkRaw = cell(row, 10);
    const coeRaw = cell(row, 11);

    if (jfaRaw && !KNOWN_JFA.has(jfaRaw)) {
      warnings.push({
        level: "warning",
        message: `Unrecognized JFA value "${jfaRaw}" for dosen ${kode}`,
        context: `DOSEN row ${rowNum}`,
      });
    }

    let tmtJfa: Date | null = null;
    if (tmtJfaRaw && !isBlankDateMarker(tmtJfaRaw)) {
      tmtJfa = parseFlexibleDate(tmtJfaRaw);
      if (!tmtJfa) {
        warnings.push({
          level: "warning",
          message: `Unparseable TMT JFA "${tmtJfaRaw}" for dosen ${kode}`,
          context: `DOSEN row ${rowNum}`,
        });
      }
    }

    const tingkatPendidikan = parseTingkatPendidikan(tingkatRaw, kode, warnings, rowNum);

    let homebaseProdiId: string | null = null;
    if (homebaseRaw) {
      const prodiKode = HOMEBASE_PRODI_MAPPING[homebaseRaw];
      homebaseProdiId = prodiKode ? prodiByKode.get(prodiKode) ?? null : null;
      if (!homebaseProdiId) {
        warnings.push({
          level: "warning",
          message: `Unrecognized homebase prodi "${homebaseRaw}" for dosen ${kode}`,
          context: `DOSEN row ${rowNum}`,
        });
      }
    }

    let kkId: string | null = null;
    if (kkRaw) {
      kkId = kkByNama.get(kkRaw) ?? null;
      if (!kkId) {
        if (IMPORT_AUTO_CREATE_UNKNOWN_LOOKUPS) {
          const created = await prisma.kelompokKeahlian.create({ data: { nama: kkRaw } });
          kkByNama.set(kkRaw, created.id);
          kkId = created.id;
          warnings.push({
            level: "warning",
            message: `Auto-created unregistered Kelompok Keilmuan "${kkRaw}" for dosen ${kode}`,
            context: `DOSEN row ${rowNum}`,
          });
        } else {
          warnings.push({
            level: "warning",
            message: `Unrecognized Kelompok Keilmuan "${kkRaw}" for dosen ${kode}`,
            context: `DOSEN row ${rowNum}`,
          });
        }
      }
    }

    let coeId: string | null = null;
    if (coeRaw) {
      coeId = coeIdByNama.get(coeRaw) ?? null;
      if (!coeId) {
        const created = await prisma.centerOfExcellence.create({ data: { nama: coeRaw } });
        coeIdByNama.set(coeRaw, created.id);
        coeId = created.id;
        counts.coeCreated++;
      }
    }

    toUpsert.push({
      rowNum,
      kode,
      data: {
        kode,
        nama,
        namaTanpaGelar,
        nipYpt,
        nidn,
        jfa: jfaRaw,
        tmtJfa,
        homebaseProdiId,
        tingkatPendidikan,
        kkId,
        coeId,
      },
    });
  }

  await prisma.$transaction(
    async (tx) => {
      for (const entry of toUpsert) {
        await tx.dosen.upsert({
          where: { kode: entry.kode },
          create: entry.data,
          update: entry.data,
        });
        if (existingKodeSet.has(entry.kode)) counts.dosenUpdated++;
        else counts.dosenCreated++;
      }
    },
    { timeout: 120_000 },
  );

  return { counts, warnings };
}
