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

  // Intentionally no join/filter on Dosen or kkId here: a prodi must be
  // listed purely because it has opened classes, regardless of plotting
  // state or which KK might eventually staff them.
  const kelasList = await prisma.kelas.findMany({
    where: { semesterPeriodeId: semester.id },
    select: {
      sks: true,
      dosenId: true,
      courseOffering: {
        select: {
          prodi: { select: { id: true, kode: true, nama: true } },
        },
      },
    },
  });

  type Aggregate = {
    kode: string;
    nama: string;
    totalKelas: number;
    plottedKelas: number;
    unplottedKelas: number;
    unplottedSks: number;
  };
  const byProdi = new Map<string, Aggregate>();
  for (const k of kelasList) {
    const prodi = k.courseOffering.prodi;
    let agg = byProdi.get(prodi.id);
    if (!agg) {
      agg = { kode: prodi.kode, nama: prodi.nama, totalKelas: 0, plottedKelas: 0, unplottedKelas: 0, unplottedSks: 0 };
      byProdi.set(prodi.id, agg);
    }
    agg.totalKelas += 1;
    if (k.dosenId) {
      agg.plottedKelas += 1;
    } else {
      agg.unplottedKelas += 1;
      agg.unplottedSks += k.sks;
    }
  }

  const summary = [...byProdi.entries()]
    .map(([prodiId, agg]) => ({ prodiId, ...agg }))
    .sort((a, b) => a.kode.localeCompare(b.kode));

  return NextResponse.json({ summary });
}
