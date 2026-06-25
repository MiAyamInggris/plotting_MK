-- Dosen accounts (Refinement 03, Points 1-2): adds an email field to Dosen,
-- a base DOSEN role, and a 1:1 dosen<->user link with a forced-password-
-- change flag. All additive/nullable -- no backfill needed.

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'DOSEN';

-- AlterTable
ALTER TABLE "Dosen" ADD COLUMN     "email" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dosenId" TEXT,
ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Dosen_email_key" ON "Dosen"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_dosenId_key" ON "User"("dosenId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_dosenId_fkey" FOREIGN KEY ("dosenId") REFERENCES "Dosen"("id") ON DELETE SET NULL ON UPDATE CASCADE;
