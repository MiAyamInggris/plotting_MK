-- CreateTable
CREATE TABLE "ProdiTarget" (
    "id" TEXT NOT NULL,
    "prodiId" TEXT NOT NULL,
    "semesterPeriodeId" TEXT NOT NULL,
    "kebutuhanSks" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProdiTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProdiTarget_prodiId_semesterPeriodeId_key" ON "ProdiTarget"("prodiId", "semesterPeriodeId");

-- AddForeignKey
ALTER TABLE "ProdiTarget" ADD CONSTRAINT "ProdiTarget_prodiId_fkey" FOREIGN KEY ("prodiId") REFERENCES "ProgramStudi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProdiTarget" ADD CONSTRAINT "ProdiTarget_semesterPeriodeId_fkey" FOREIGN KEY ("semesterPeriodeId") REFERENCES "SemesterPeriode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
