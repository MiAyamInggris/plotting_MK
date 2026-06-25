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
  const activePeriode = semesterResult.semester;

  const [programStudiList, targets, kelasList] = await Promise.all([
    prisma.programStudi.findMany({ orderBy: { kode: "asc" } }),
    prisma.prodiTarget.findMany({ where: { semesterPeriodeId: activePeriode.id } }),
    prisma.kelas.findMany({
      where: { dosenId: { not: null }, semesterPeriodeId: activePeriode.id },
      select: { sks: true, courseOffering: { select: { prodiId: true } } },
    }),
  ]);

  const targetByProdi = new Map(targets.map((t) => [t.prodiId, t]));

  const sudahDiampuByProdi = new Map<string, { sks: number; kelas: number }>();
  for (const k of kelasList) {
    const prodiId = k.courseOffering.prodiId;
    const entry = sudahDiampuByProdi.get(prodiId) ?? { sks: 0, kelas: 0 };
    entry.sks += k.sks;
    entry.kelas += 1;
    sudahDiampuByProdi.set(prodiId, entry);
  }

  const result = programStudiList.map((p) => {
    const target = targetByProdi.get(p.id);
    const sudah = sudahDiampuByProdi.get(p.id) ?? { sks: 0, kelas: 0 };
    return {
      id: p.id,
      kode: p.kode,
      nama: p.nama,
      kebutuhanSks: target?.kebutuhanSks ?? null,
      sudahDiampu: sudah.sks,
      kekuranganSks: target ? target.kebutuhanSks - sudah.sks : null,
      jumlahKelas: sudah.kelas,
    };
  });

  return NextResponse.json({ prodiSummary: result, activePeriode });
}
