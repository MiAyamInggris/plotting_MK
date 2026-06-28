import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { resolveSemester } from "@/lib/semester";
import { DEFAULT_SKS_CAP } from "@/lib/config";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const kkId = searchParams.get("kkId");
  const homebaseProdiId = searchParams.get("homebaseProdiId");

  const semesterResult = await resolveSemester(user, searchParams.get("semesterPeriodeId"));
  if (!semesterResult.ok) {
    return NextResponse.json({ error: semesterResult.error }, { status: semesterResult.status });
  }
  const activePeriode = semesterResult.semester;

  const dosenList = await prisma.dosen.findMany({
    where: {
      aktif: true,
      ...(kkId ? { kkId } : {}),
      ...(homebaseProdiId ? { homebaseProdiId } : {}),
    },
    orderBy: { kode: "asc" },
    select: {
      id: true,
      kode: true,
      nama: true,
      jfa: true,
      bebanStruktural: true,
      bebanStrukturalSks: true,
      kk: { select: { nama: true } },
      homebaseProdi: { select: { kode: true } },
    },
  });

  // Beban SKS sums across every prodi a dosen teaches in -- never filtered by
  // homebase or KK, since a dosen can be plotted cross-prodi.
  const kelasList = await prisma.kelas.findMany({
    where: {
      dosenId: { not: null },
      semesterPeriodeId: activePeriode.id,
    },
    select: {
      sks: true,
      dosenId: true,
      courseOffering: {
        select: { mataKuliahId: true, prodi: { select: { kode: true, nama: true } } },
      },
    },
  });

  type Aggregate = {
    totalSksPengajaran: number;
    jumlahKelas: number;
    mataKuliahIds: Set<string>;
    byProdi: Map<string, { prodiKode: string; prodiNama: string; kelas: number; sks: number }>;
  };
  const byDosen = new Map<string, Aggregate>();
  for (const k of kelasList) {
    if (!k.dosenId) continue;
    let agg = byDosen.get(k.dosenId);
    if (!agg) {
      agg = { totalSksPengajaran: 0, jumlahKelas: 0, mataKuliahIds: new Set(), byProdi: new Map() };
      byDosen.set(k.dosenId, agg);
    }
    agg.totalSksPengajaran += k.sks;
    agg.jumlahKelas += 1;
    agg.mataKuliahIds.add(k.courseOffering.mataKuliahId);
    const prodiKode = k.courseOffering.prodi.kode;
    const prodiEntry = agg.byProdi.get(prodiKode) ?? {
      prodiKode,
      prodiNama: k.courseOffering.prodi.nama,
      kelas: 0,
      sks: 0,
    };
    prodiEntry.kelas += 1;
    prodiEntry.sks += k.sks;
    agg.byProdi.set(prodiKode, prodiEntry);
  }

  const result = dosenList.map((d) => {
    const agg = byDosen.get(d.id);
    const totalSksPengajaran = agg?.totalSksPengajaran ?? 0;
    const totalBeban = totalSksPengajaran + (d.bebanStrukturalSks ?? 0);
    return {
      id: d.id,
      kode: d.kode,
      nama: d.nama,
      jfa: d.jfa,
      bebanStruktural: d.bebanStruktural,
      bebanStrukturalSks: d.bebanStrukturalSks,
      kk: d.kk?.nama ?? null,
      homebaseProdi: d.homebaseProdi?.kode ?? null,
      totalSksPengajaran,
      totalBeban,
      overQuota: totalBeban > DEFAULT_SKS_CAP,
      jumlahKelas: agg?.jumlahKelas ?? 0,
      jumlahMK: agg?.mataKuliahIds.size ?? 0,
      byProdi: agg ? [...agg.byProdi.values()] : [],
    };
  });

  result.sort((a, b) => b.totalBeban - a.totalBeban);

  return NextResponse.json({ dosen: result, activePeriode, sksCap: DEFAULT_SKS_CAP });
}
