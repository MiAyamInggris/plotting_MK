import "dotenv/config";
import { PrismaClient, Jenjang } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const KELOMPOK_KEAHLIAN = [
  "KK Applied Artificial Intelligence",
  "KK Bioengineering, Food Technology and Advanced Material",
  "KK Cyber Security, IoT, and Cloud Systems",
  "KK Data Science and Optimization",
  "KK Electronics and Telecommunications Science",
  "KK Industrial Systems Engineering",
  "KK Information System, Digital Business, Data Driven Solution",
  "KK Software Engineering and Multimedia",
  "KK- Media, Creative Design, and Cultural Studies",
];

const PROGRAM_STUDI: { kode: string; nama: string; jenjang: Jenjang }[] = [
  { kode: "IF", nama: "S1 Teknik Informatika", jenjang: "S1" },
  { kode: "SI", nama: "S1 Sistem Informasi", jenjang: "S1" },
  { kode: "SE", nama: "S1 Rekayasa Perangkat Lunak", jenjang: "S1" },
  { kode: "SD", nama: "S1 Sains Data", jenjang: "S1" },
  { kode: "TT_S1", nama: "S1 Teknik Telekomunikasi", jenjang: "S1" },
  { kode: "TT_S1_AJ", nama: "S1 Teknik Telekomunikasi (Alih Jenjang)", jenjang: "S1" },
  { kode: "TT_D3", nama: "D3 Teknik Telekomunikasi", jenjang: "D3" },
  { kode: "TE", nama: "S1 Teknik Elektro", jenjang: "S1" },
  { kode: "TB", nama: "S1 Teknik Biomedis", jenjang: "S1" },
  { kode: "DP", nama: "S1 Desain Produk", jenjang: "S1" },
  { kode: "DKV", nama: "S1 Desain Komunikasi Visual", jenjang: "S1" },
  { kode: "TL", nama: "S1 Teknik Logistik", jenjang: "S1" },
  { kode: "BD", nama: "S1 Bisnis Digital", jenjang: "S1" },
  { kode: "TI", nama: "S1 Teknik Industri", jenjang: "S1" },
  { kode: "TP", nama: "S1 Teknologi Pangan", jenjang: "S1" },
];

const DEFAULT_ADMIN_EMAIL = "admin@local";
const DEFAULT_ADMIN_PASSWORD = "changeme";

// Institutional "Kebutuhan SKS" targets, from row 1 of the source workbook's
// Beban Dosen sheet. DKV is omitted: its source cell is a broken #REF! formula,
// so an Admin should set that target manually via the Recap page.
const KEBUTUHAN_SKS: Record<string, number> = {
  IF: 552,
  SI: 317,
  SE: 147,
  SD: 109,
  TT_S1: 161,
  TT_S1_AJ: 26,
  TT_D3: 72,
  TE: 108,
  TB: 159,
  DP: 80,
  TI: 256.9375,
  TL: 78,
  BD: 322,
  TP: 85,
};

async function main() {
  for (const nama of KELOMPOK_KEAHLIAN) {
    await prisma.kelompokKeahlian.upsert({
      where: { nama },
      update: {},
      create: { nama },
    });
  }
  console.log(`Seeded ${KELOMPOK_KEAHLIAN.length} Kelompok Keahlian.`);

  for (const ps of PROGRAM_STUDI) {
    await prisma.programStudi.upsert({
      where: { kode: ps.kode },
      update: { nama: ps.nama, jenjang: ps.jenjang },
      create: ps,
    });
  }
  console.log(`Seeded ${PROGRAM_STUDI.length} Program Studi.`);

  let activePeriode = await prisma.semesterPeriode.findFirst({
    where: { nama: "Ganjil 2025/2026" },
  });
  if (!activePeriode) {
    activePeriode = await prisma.semesterPeriode.create({
      data: {
        nama: "Ganjil 2025/2026",
        tipe: "GANJIL",
        tahunAjaran: "2025/2026",
        aktif: true,
      },
    });
    console.log("Seeded active SemesterPeriode: Ganjil 2025/2026.");
  } else {
    console.log("SemesterPeriode Ganjil 2025/2026 already exists.");
  }

  for (const [prodiKode, kebutuhanSks] of Object.entries(KEBUTUHAN_SKS)) {
    const prodi = await prisma.programStudi.findUnique({ where: { kode: prodiKode } });
    if (!prodi) continue;
    await prisma.prodiTarget.upsert({
      where: { prodiId_semesterPeriodeId: { prodiId: prodi.id, semesterPeriodeId: activePeriode.id } },
      update: { kebutuhanSks },
      create: { prodiId: prodi.id, semesterPeriodeId: activePeriode.id, kebutuhanSks },
    });
  }
  console.log(`Seeded Kebutuhan SKS targets for ${Object.keys(KEBUTUHAN_SKS).length} Program Studi.`);

  const existingAdmin = await prisma.user.findUnique({
    where: { email: DEFAULT_ADMIN_EMAIL },
  });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
    await prisma.user.create({
      data: {
        email: DEFAULT_ADMIN_EMAIL,
        passwordHash,
        name: "Administrator",
        role: "ADMIN",
      },
    });
    console.log(
      `Seeded admin user ${DEFAULT_ADMIN_EMAIL} / ${DEFAULT_ADMIN_PASSWORD} — CHANGE THIS PASSWORD after first login.`,
    );
  } else {
    console.log("Admin user already exists, skipping.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
