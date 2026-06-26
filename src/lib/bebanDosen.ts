import { prisma } from "@/lib/prisma";

export type DosenLoadBreakdown = {
  totalSks: number;
  byProdi: { prodiKode: string; prodiNama: string; sks: number }[];
  byMataKuliah: { kodeMK: string; nama: string; sks: number }[];
  byKelas: { kodeKelas: string; sectionSuffix: string; sks: number }[];
};

export async function computeDosenLoadBreakdown(
  dosenId: string,
  semesterPeriodeId: string,
): Promise<DosenLoadBreakdown> {
  const kelasList = await prisma.kelas.findMany({
    where: { dosenId, semesterPeriodeId },
    select: {
      kodeKelas: true,
      sectionSuffix: true,
      sks: true,
      courseOffering: {
        select: {
          mataKuliahId: true,
          mataKuliah: { select: { kodeMK: true, nama: true } },
          prodi: { select: { id: true, kode: true, nama: true } },
        },
      },
    },
  });

  let totalSks = 0;
  const byProdiMap = new Map<string, { prodiKode: string; prodiNama: string; sks: number }>();
  const byMataKuliahMap = new Map<string, { kodeMK: string; nama: string; sks: number }>();
  const byKelas: { kodeKelas: string; sectionSuffix: string; sks: number }[] = [];

  for (const k of kelasList) {
    totalSks += k.sks;
    byKelas.push({ kodeKelas: k.kodeKelas, sectionSuffix: k.sectionSuffix, sks: k.sks });

    const prodi = k.courseOffering.prodi;
    const prodiAgg = byProdiMap.get(prodi.id) ?? { prodiKode: prodi.kode, prodiNama: prodi.nama, sks: 0 };
    prodiAgg.sks += k.sks;
    byProdiMap.set(prodi.id, prodiAgg);

    const mk = k.courseOffering.mataKuliah;
    const mkId = k.courseOffering.mataKuliahId;
    const mkAgg = byMataKuliahMap.get(mkId) ?? { kodeMK: mk.kodeMK, nama: mk.nama, sks: 0 };
    mkAgg.sks += k.sks;
    byMataKuliahMap.set(mkId, mkAgg);
  }

  return {
    totalSks,
    byProdi: [...byProdiMap.values()],
    byMataKuliah: [...byMataKuliahMap.values()],
    byKelas,
  };
}
