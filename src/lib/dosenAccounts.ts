import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { ImportReport, ImportWarning } from "@/lib/import/types";

// Default password = NIP truncated at the first "-" (e.g. "19910017-1" ->
// "19910017"; "25000021" -> "25000021" unchanged). Predictable on purpose —
// every account is created with mustChangePassword = true, forcing a real
// password before the rest of the app is usable.
export async function generateDosenAccounts(): Promise<ImportReport> {
  const warnings: ImportWarning[] = [];
  const counts = { accountsCreated: 0, skippedNoEmail: 0, skippedNoNip: 0 };

  const dosenList = await prisma.dosen.findMany({
    select: {
      id: true,
      kode: true,
      nama: true,
      email: true,
      nipYpt: true,
      user: { select: { id: true } },
    },
  });

  for (const dosen of dosenList) {
    if (dosen.user) continue; // already provisioned — idempotent, not a warning

    if (!dosen.email) {
      counts.skippedNoEmail++;
      warnings.push({
        level: "warning",
        message: `Dosen ${dosen.kode} has no email; skipped`,
        context: dosen.kode,
      });
      continue;
    }

    if (!dosen.nipYpt) {
      counts.skippedNoNip++;
      warnings.push({
        level: "warning",
        message: `Dosen ${dosen.kode} has no NIP; cannot derive a default password, skipped`,
        context: dosen.kode,
      });
      continue;
    }

    const defaultPassword = dosen.nipYpt.split("-")[0];
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    try {
      await prisma.user.create({
        data: {
          email: dosen.email,
          passwordHash,
          name: dosen.nama,
          role: "DOSEN",
          dosenId: dosen.id,
          mustChangePassword: true,
        },
      });
      counts.accountsCreated++;
    } catch {
      warnings.push({
        level: "error",
        message: `Failed to create account for ${dosen.kode}: email "${dosen.email}" may already be in use by another user`,
        context: dosen.kode,
      });
    }
  }

  return { counts, warnings };
}
