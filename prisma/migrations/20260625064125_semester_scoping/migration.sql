-- Semester scoping (Refinement 02, Point 1).
--
-- Backfills the new Kelas.semesterPeriodeId from the single existing active
-- SemesterPeriode before enforcing NOT NULL, so this is safe to run against a
-- populated production database with prisma migrate deploy (no separate
-- manual backfill step required). Refuses to proceed (rolling back the whole
-- migration) if it can't find exactly one active SemesterPeriode, rather than
-- guessing.

-- AlterTable: SemesterPeriode gets the read-only-visibility flag.
ALTER TABLE "SemesterPeriode" ADD COLUMN "visibleToScopedRoles" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Kelas gets a nullable semesterPeriodeId for now; backfilled below.
ALTER TABLE "Kelas" ADD COLUMN "semesterPeriodeId" TEXT;

-- Backfill guarded by an explicit precondition check.
DO $$
DECLARE
  active_count integer;
  active_id text;
BEGIN
  SELECT count(*) INTO active_count FROM "SemesterPeriode" WHERE "aktif" = true;

  IF active_count <> 1 THEN
    RAISE EXCEPTION
      'Expected exactly one active SemesterPeriode to backfill Kelas.semesterPeriodeId, found %. Resolve this before re-running the migration.',
      active_count;
  END IF;

  SELECT "id" INTO active_id FROM "SemesterPeriode" WHERE "aktif" = true;

  UPDATE "Kelas" SET "semesterPeriodeId" = active_id WHERE "semesterPeriodeId" IS NULL;
END $$;

-- Now safe to enforce NOT NULL.
ALTER TABLE "Kelas" ALTER COLUMN "semesterPeriodeId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Kelas" ADD CONSTRAINT "Kelas_semesterPeriodeId_fkey" FOREIGN KEY ("semesterPeriodeId") REFERENCES "SemesterPeriode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Kelas_semesterPeriodeId_idx" ON "Kelas"("semesterPeriodeId");

-- Replace the CourseOffering uniqueness scope: (mataKuliahId, kelasPrefix) ->
-- (semesterPeriodeId, mataKuliahId, kelasPrefix), so the same course can have
-- a same-prefix offering reused across different semesters without collision.
-- This was added as a table CONSTRAINT (not a bare index) by the
-- 20260624084643_course_offering_unique migration, so it must be dropped as one.
ALTER TABLE "CourseOffering" DROP CONSTRAINT "CourseOffering_mataKuliahId_kelasPrefix_key";

CREATE UNIQUE INDEX "CourseOffering_semesterPeriodeId_mataKuliahId_kelasPrefix_key" ON "CourseOffering"("semesterPeriodeId", "mataKuliahId", "kelasPrefix");
