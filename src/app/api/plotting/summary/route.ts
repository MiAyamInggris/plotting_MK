import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { resolveSemester } from "@/lib/semester";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const semesterResult = await resolveSemester(user, searchParams.get("semesterPeriodeId"));
  if (!semesterResult.ok) {
    return NextResponse.json({ error: semesterResult.error }, { status: semesterResult.status });
  }
  const { semester } = semesterResult;

  const kelasList = await prisma.kelas.findMany({
    where: { semesterPeriodeId: semester.id },
    select: {
      sks: true,
      dosenId: true,
      courseOffering: {
        select: {
          mataKuliahId: true,
          prodi: { select: { id: true, kode: true, nama: true } },
        },
      },
    },
  });

  type Aggregate = {
    kode: string;
    nama: string;
    unplottedSks: number;
    unplottedMataKuliahIds: Set<string>;
  };
  const byProdi = new Map<string, Aggregate>();
  for (const k of kelasList) {
    const prodi = k.courseOffering.prodi;
    let agg = byProdi.get(prodi.id);
    if (!agg) {
      agg = { kode: prodi.kode, nama: prodi.nama, unplottedSks: 0, unplottedMataKuliahIds: new Set() };
      byProdi.set(prodi.id, agg);
    }
    if (!k.dosenId) {
      agg.unplottedSks += k.sks;
      agg.unplottedMataKuliahIds.add(k.courseOffering.mataKuliahId);
    }
  }

  const summary = [...byProdi.entries()]
    .map(([prodiId, agg]) => ({
      prodiId,
      kode: agg.kode,
      nama: agg.nama,
      unplottedMataKuliah: agg.unplottedMataKuliahIds.size,
      unplottedSks: agg.unplottedSks,
    }))
    .sort((a, b) => a.kode.localeCompare(b.kode));

  return NextResponse.json({ summary });
}
