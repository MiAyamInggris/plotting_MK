import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const kkId = searchParams.get("kkId");
  const homebaseProdiId = searchParams.get("homebaseProdiId");

  const activePeriode = await prisma.semesterPeriode.findFirst({ where: { aktif: true } });
  if (!activePeriode) {
    return NextResponse.json({ error: "No active SemesterPeriode is configured" }, { status: 400 });
  }

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
      kk: { select: { nama: true } },
      homebaseProdi: { select: { kode: true } },
    },
  });

  const kelasList = await prisma.kelas.findMany({
    where: {
      dosenId: { not: null },
      courseOffering: { semesterPeriodeId: activePeriode.id },
    },
    select: {
      sks: true,
      dosenId: true,
      courseOffering: {
        select: { mataKuliahId: true, prodi: { select: { kode: true } } },
      },
    },
  });

  type Aggregate = {
    totalSksPengajaran: number;
    jumlahKelas: number;
    mataKuliahIds: Set<string>;
    sksPerProdi: Record<string, number>;
  };
  const byDosen = new Map<string, Aggregate>();
  for (const k of kelasList) {
    if (!k.dosenId) continue;
    let agg = byDosen.get(k.dosenId);
    if (!agg) {
      agg = { totalSksPengajaran: 0, jumlahKelas: 0, mataKuliahIds: new Set(), sksPerProdi: {} };
      byDosen.set(k.dosenId, agg);
    }
    agg.totalSksPengajaran += k.sks;
    agg.jumlahKelas += 1;
    agg.mataKuliahIds.add(k.courseOffering.mataKuliahId);
    const prodiKode = k.courseOffering.prodi.kode;
    agg.sksPerProdi[prodiKode] = (agg.sksPerProdi[prodiKode] ?? 0) + k.sks;
  }

  const result = dosenList.map((d) => {
    const agg = byDosen.get(d.id);
    return {
      id: d.id,
      kode: d.kode,
      nama: d.nama,
      jfa: d.jfa,
      bebanStruktural: d.bebanStruktural,
      kk: d.kk?.nama ?? null,
      homebaseProdi: d.homebaseProdi?.kode ?? null,
      totalSksPengajaran: agg?.totalSksPengajaran ?? 0,
      jumlahKelas: agg?.jumlahKelas ?? 0,
      jumlahMK: agg?.mataKuliahIds.size ?? 0,
      sksPerProdi: agg?.sksPerProdi ?? {},
    };
  });

  return NextResponse.json({ dosen: result, activePeriode });
}
