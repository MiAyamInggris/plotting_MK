import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import type { ImportReport, ImportWarning } from "./types";

function cell(row: unknown[], i: number): string | null {
  const v = row[i];
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

// Columns: No | Kode MK | Nama MK | SKS (header row, "No" ignored). Upserts
// by the existing (kodeMK, prodiId) unique constraint -- creates new rows,
// updates nama/sks on existing ones, never touches `ket` (not in this sheet).
export async function importMataKuliahCatalog(buffer: Buffer, prodiId: string): Promise<ImportReport> {
  const warnings: ImportWarning[] = [];
  const counts = { created: 0, updated: 0 };

  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  const ws = sheetName ? wb.Sheets[sheetName] : undefined;
  if (!ws) {
    throw new Error("No sheet found in the Mata Kuliah file");
  }

  const allRows: unknown[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    raw: false,
    defval: null,
  });
  const rows = allRows.slice(1); // skip header row

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const rowNum = i + 2; // +1 for header, +1 for 1-based row numbers

    const kodeMK = cell(row, 1);
    if (!kodeMK) {
      warnings.push({ level: "error", message: "Kode MK is empty; row skipped", context: `row ${rowNum}` });
      continue;
    }

    const nama = cell(row, 2);
    if (!nama) {
      warnings.push({ level: "error", message: `Nama MK is empty for "${kodeMK}"; row skipped`, context: `row ${rowNum}` });
      continue;
    }

    const sksRaw = cell(row, 3);
    const sks = sksRaw ? Number(sksRaw) : NaN;
    if (!sksRaw || Number.isNaN(sks) || sks <= 0) {
      warnings.push({
        level: "error",
        message: `SKS "${sksRaw ?? ""}" for "${kodeMK}" is not a valid positive number; row skipped`,
        context: `row ${rowNum}`,
      });
      continue;
    }

    const existing = await prisma.mataKuliah.findUnique({
      where: { kodeMK_prodiId: { kodeMK, prodiId } },
    });

    if (existing) {
      await prisma.mataKuliah.update({
        where: { id: existing.id },
        data: { nama, sks },
      });
      counts.updated++;
    } else {
      await prisma.mataKuliah.create({
        data: { kodeMK, nama, sks, prodiId },
      });
      counts.created++;
    }
  }

  return { counts, warnings };
}
