-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'KAPRODI', 'KETUA_KK');

-- CreateEnum
CREATE TYPE "SemesterTipe" AS ENUM ('GANJIL', 'GENAP');

-- CreateEnum
CREATE TYPE "Jenjang" AS ENUM ('S1', 'D3');

-- CreateEnum
CREATE TYPE "TingkatPendidikan" AS ENUM ('S2', 'S3', 'ON_GOING_S3');

-- CreateTable
CREATE TABLE "ProgramStudi" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "jenjang" "Jenjang" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramStudi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KelompokKeahlian" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kodeSingkat" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KelompokKeahlian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CenterOfExcellence" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CenterOfExcellence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dosen" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "namaTanpaGelar" TEXT NOT NULL,
    "nipYpt" TEXT,
    "nidn" TEXT,
    "jfa" TEXT,
    "tmtJfa" TIMESTAMP(3),
    "homebaseProdiId" TEXT,
    "tingkatPendidikan" "TingkatPendidikan",
    "kkId" TEXT,
    "coeId" TEXT,
    "bebanStruktural" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dosen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MataKuliah" (
    "id" TEXT NOT NULL,
    "kodeMK" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "sks" DOUBLE PRECISION NOT NULL,
    "prodiId" TEXT NOT NULL,
    "ket" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MataKuliah_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SemesterPeriode" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "tipe" "SemesterTipe" NOT NULL,
    "tahunAjaran" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SemesterPeriode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseOffering" (
    "id" TEXT NOT NULL,
    "mataKuliahId" TEXT NOT NULL,
    "semesterPeriodeId" TEXT NOT NULL,
    "semesterKe" INTEGER NOT NULL,
    "tahunAngkatan" INTEGER NOT NULL,
    "prodiId" TEXT NOT NULL,
    "kelasPrefix" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseOffering_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kelas" (
    "id" TEXT NOT NULL,
    "courseOfferingId" TEXT NOT NULL,
    "kodeKelas" TEXT NOT NULL,
    "sectionSuffix" TEXT NOT NULL,
    "sks" DOUBLE PRECISION NOT NULL,
    "dosenId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Kelas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "prodiId" TEXT,
    "kkId" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProgramStudi_kode_key" ON "ProgramStudi"("kode");

-- CreateIndex
CREATE INDEX "ProgramStudi_kode_idx" ON "ProgramStudi"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "KelompokKeahlian_nama_key" ON "KelompokKeahlian"("nama");

-- CreateIndex
CREATE INDEX "KelompokKeahlian_nama_idx" ON "KelompokKeahlian"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "CenterOfExcellence_nama_key" ON "CenterOfExcellence"("nama");

-- CreateIndex
CREATE INDEX "CenterOfExcellence_nama_idx" ON "CenterOfExcellence"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "Dosen_kode_key" ON "Dosen"("kode");

-- CreateIndex
CREATE INDEX "Dosen_kode_idx" ON "Dosen"("kode");

-- CreateIndex
CREATE INDEX "Dosen_homebaseProdiId_idx" ON "Dosen"("homebaseProdiId");

-- CreateIndex
CREATE INDEX "Dosen_kkId_idx" ON "Dosen"("kkId");

-- CreateIndex
CREATE INDEX "Dosen_coeId_idx" ON "Dosen"("coeId");

-- CreateIndex
CREATE INDEX "MataKuliah_prodiId_idx" ON "MataKuliah"("prodiId");

-- CreateIndex
CREATE INDEX "MataKuliah_kodeMK_idx" ON "MataKuliah"("kodeMK");

-- CreateIndex
CREATE UNIQUE INDEX "MataKuliah_kodeMK_prodiId_key" ON "MataKuliah"("kodeMK", "prodiId");

-- CreateIndex
CREATE INDEX "SemesterPeriode_aktif_idx" ON "SemesterPeriode"("aktif");

-- CreateIndex
CREATE INDEX "CourseOffering_semesterPeriodeId_prodiId_idx" ON "CourseOffering"("semesterPeriodeId", "prodiId");

-- CreateIndex
CREATE INDEX "CourseOffering_mataKuliahId_idx" ON "CourseOffering"("mataKuliahId");

-- CreateIndex
CREATE INDEX "CourseOffering_prodiId_idx" ON "CourseOffering"("prodiId");

-- CreateIndex
CREATE INDEX "Kelas_courseOfferingId_idx" ON "Kelas"("courseOfferingId");

-- CreateIndex
CREATE INDEX "Kelas_dosenId_idx" ON "Kelas"("dosenId");

-- CreateIndex
CREATE INDEX "Kelas_kodeKelas_idx" ON "Kelas"("kodeKelas");

-- CreateIndex
CREATE UNIQUE INDEX "Kelas_courseOfferingId_sectionSuffix_key" ON "Kelas"("courseOfferingId", "sectionSuffix");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_prodiId_idx" ON "User"("prodiId");

-- CreateIndex
CREATE INDEX "User_kkId_idx" ON "User"("kkId");

-- AddForeignKey
ALTER TABLE "Dosen" ADD CONSTRAINT "Dosen_homebaseProdiId_fkey" FOREIGN KEY ("homebaseProdiId") REFERENCES "ProgramStudi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dosen" ADD CONSTRAINT "Dosen_kkId_fkey" FOREIGN KEY ("kkId") REFERENCES "KelompokKeahlian"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dosen" ADD CONSTRAINT "Dosen_coeId_fkey" FOREIGN KEY ("coeId") REFERENCES "CenterOfExcellence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MataKuliah" ADD CONSTRAINT "MataKuliah_prodiId_fkey" FOREIGN KEY ("prodiId") REFERENCES "ProgramStudi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseOffering" ADD CONSTRAINT "CourseOffering_mataKuliahId_fkey" FOREIGN KEY ("mataKuliahId") REFERENCES "MataKuliah"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseOffering" ADD CONSTRAINT "CourseOffering_semesterPeriodeId_fkey" FOREIGN KEY ("semesterPeriodeId") REFERENCES "SemesterPeriode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseOffering" ADD CONSTRAINT "CourseOffering_prodiId_fkey" FOREIGN KEY ("prodiId") REFERENCES "ProgramStudi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kelas" ADD CONSTRAINT "Kelas_courseOfferingId_fkey" FOREIGN KEY ("courseOfferingId") REFERENCES "CourseOffering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kelas" ADD CONSTRAINT "Kelas_dosenId_fkey" FOREIGN KEY ("dosenId") REFERENCES "Dosen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_prodiId_fkey" FOREIGN KEY ("prodiId") REFERENCES "ProgramStudi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_kkId_fkey" FOREIGN KEY ("kkId") REFERENCES "KelompokKeahlian"("id") ON DELETE SET NULL ON UPDATE CASCADE;
