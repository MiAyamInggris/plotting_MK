import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Idempotent safety-net for the 20260625064125_semester_scoping migration's
// embedded backfill. The migration already backfills Kelas.semesterPeriodeId
// from the active SemesterPeriode inside the same transaction that adds the
// NOT NULL constraint, so under a normal `prisma migrate deploy` this script
// finds nothing to do. It exists so the backfill can be independently
// re-verified or re-run — e.g. against a database where the migration's DDL
// was applied without its embedded DML (a manually edited migration
// history) — using raw SQL rather than the Prisma Client, since the
// generated types assume the NOT NULL invariant already holds and so can't
// even express "find the rows missing it".
async function main() {
  const nullCountRows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT count(*)::bigint AS count FROM "Kelas" WHERE "semesterPeriodeId" IS NULL
  `;
  const nullCount = Number(nullCountRows[0]?.count ?? 0);

  if (nullCount === 0) {
    const totalKelas = await prisma.kelas.count();
    console.log(`Nothing to backfill — all ${totalKelas} Kelas row(s) already have semesterPeriodeId.`);
    return;
  }

  const activeCountRows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT count(*)::bigint AS count FROM "SemesterPeriode" WHERE "aktif" = true
  `;
  const activeCount = Number(activeCountRows[0]?.count ?? 0);
  if (activeCount !== 1) {
    throw new Error(
      `Expected exactly one active SemesterPeriode to backfill ${nullCount} Kelas row(s), found ${activeCount}. Resolve this before re-running.`,
    );
  }

  const updated = await prisma.$executeRaw`
    UPDATE "Kelas"
    SET "semesterPeriodeId" = (SELECT id FROM "SemesterPeriode" WHERE "aktif" = true)
    WHERE "semesterPeriodeId" IS NULL
  `;

  console.log(`Backfilled semesterPeriodeId on ${updated} Kelas row(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
