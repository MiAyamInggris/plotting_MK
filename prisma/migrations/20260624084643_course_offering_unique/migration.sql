-- AlterTable: add unique constraint for idempotent import upserts
ALTER TABLE "CourseOffering" ADD CONSTRAINT "CourseOffering_mataKuliahId_kelasPrefix_key" UNIQUE ("mataKuliahId", "kelasPrefix");
