import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import type { ImportReport, ImportWarning } from "./types";

function cell(row: unknown[], i: number): string | null {
  const v = row[i];
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

// Real source data has no header row and only 3 columns: KODE, NAMA (ignored
// — join is on kode only), E-MAIL. No NIP/NIDN/KK columns exist in it.
export async function importDosenEmail(buffer: Buffer): Promise<ImportReport> {
  const warnings: ImportWarning[] = [];
  const counts = { emailUpdated: 0 };

  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  const ws = sheetName ? wb.Sheets[sheetName] : undefined;
  if (!ws) {
    throw new Error("No sheet found in the dosen email file");
  }

  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    raw: false,
    defval: null,
  });

  const existingDosen = await prisma.dosen.findMany({ select: { id: true, kode: true } });
  const dosenByKode = new Map(existingDosen.map((d) => [d.kode, d.id]));
  const matchedKodes = new Set<string>();

  type ParsedRow = { rowNum: number; kode: string; email: string };
  const parsedRows: ParsedRow[] = [];
  const kodesByEmail = new Map<string, string[]>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const kode = cell(row, 0)?.toUpperCase() ?? null;
    if (!kode) continue;

    const emailRaw = cell(row, 2);
    if (!emailRaw) {
      warnings.push({
        level: "warning",
        message: `Dosen ${kode} has no email value in the file`,
        context: `row ${i + 1}`,
      });
      continue;
    }

    // Real-world copy/paste artifact: stray internal whitespace in emails.
    const email = emailRaw.replace(/\s+/g, "").toLowerCase();
    parsedRows.push({ rowNum: i + 1, kode, email });
    kodesByEmail.set(email, [...(kodesByEmail.get(email) ?? []), kode]);
  }

  const duplicateEmails = new Set(
    [...kodesByEmail.entries()].filter(([, kodes]) => kodes.length > 1).map(([email]) => email),
  );

  // Each update runs as its own statement (no shared $transaction): a
  // unique-constraint conflict on one row must not silently abort every
  // other row in the same Postgres transaction (catching the JS exception
  // doesn't help once a transaction is in its aborted state).
  for (const row of parsedRows) {
    matchedKodes.add(row.kode);

    if (duplicateEmails.has(row.email)) {
      warnings.push({
        level: "error",
        message: `Email "${row.email}" is used by multiple KODE in the file (${kodesByEmail
          .get(row.email)!
          .join(", ")}); skipped`,
        context: `row ${row.rowNum}`,
      });
      continue;
    }

    const dosenId = dosenByKode.get(row.kode);
    if (!dosenId) {
      warnings.push({
        level: "warning",
        message: `KODE "${row.kode}" in the email file has no matching Dosen`,
        context: `row ${row.rowNum}`,
      });
      continue;
    }

    try {
      await prisma.dosen.update({ where: { id: dosenId }, data: { email: row.email } });
      counts.emailUpdated++;
    } catch {
      warnings.push({
        level: "error",
        message: `Failed to set email for ${row.kode}: "${row.email}" may already be in use by another dosen`,
        context: `row ${row.rowNum}`,
      });
    }
  }

  for (const d of existingDosen) {
    if (!matchedKodes.has(d.kode)) {
      warnings.push({
        level: "warning",
        message: `Dosen ${d.kode} has no entry in the email import file`,
        context: d.kode,
      });
    }
  }

  return { counts, warnings };
}
