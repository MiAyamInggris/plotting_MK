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

  const dosenList = await prisma.dosen.findMany({
    where: {
      aktif: true,
      ...(user.role === "KETUA_KK" ? { kkId: user.kkId } : {}),
    },
    orderBy: { kode: "asc" },
    select: {
      id: true,
      kode: true,
      nama: true,
      kkId: true,
      aktif: true,
      jenis: true,
      bebanStrukturalSks: true,
    },
  });

  const loadByDosen = await prisma.kelas.groupBy({
    by: ["dosenId"],
    where: { semesterPeriodeId: semester.id, dosenId: { not: null } },
    _sum: { sks: true },
  });
  const totalSksByDosen = new Map(loadByDosen.map((row) => [row.dosenId, row._sum.sks ?? 0]));

  // totalSks here is the full beban (teaching + struktural), matching the
  // same cap warning and Beban Dosen recap figure -- never a second,
  // teaching-only number that could silently disagree.
  const options = dosenList.map(({ bebanStrukturalSks, ...d }) => ({
    ...d,
    totalSks: (totalSksByDosen.get(d.id) ?? 0) + (bebanStrukturalSks ?? 0),
  }));

  return NextResponse.json({ dosen: options });
}
