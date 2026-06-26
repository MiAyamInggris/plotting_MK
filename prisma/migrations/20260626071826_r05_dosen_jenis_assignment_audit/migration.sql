-- CreateEnum
CREATE TYPE "DosenJenis" AS ENUM ('TETAP', 'DLB');

-- AlterTable
ALTER TABLE "Dosen" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "jenis" "DosenJenis" NOT NULL DEFAULT 'TETAP';

-- AlterTable
ALTER TABLE "Kelas" ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "assignedById" TEXT;

-- AddForeignKey
ALTER TABLE "Dosen" ADD CONSTRAINT "Dosen_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kelas" ADD CONSTRAINT "Kelas_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
