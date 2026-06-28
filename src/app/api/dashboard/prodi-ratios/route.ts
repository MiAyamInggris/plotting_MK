import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { resolveSemester } from "@/lib/semester";
import { computeProdiRatios } from "@/lib/dosenRatios";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const queryProdiId = searchParams.get("prodiId");
  // Kaprodi is always scoped to their own prodi. Ketua KK / Admin may pass
  // an optional prodiId to narrow down, or omit it to see every prodi.
  const prodiId = user.role === "KAPRODI" ? user.prodiId : queryProdiId;

  const semesterResult = await resolveSemester(user, searchParams.get("semesterPeriodeId"));
  if (!semesterResult.ok) {
    return NextResponse.json({ error: semesterResult.error }, { status: semesterResult.status });
  }
  const activePeriode = semesterResult.semester;

  const allProdi = await prisma.programStudi.findMany({
    where: prodiId ? { id: prodiId } : undefined,
    orderBy: { kode: "asc" },
    select: { id: true, kode: true, nama: true },
  });

  // Basis = dosen actually assigned to >=1 Kelas in the prodi this semester
  // (never homebase), consistent with every other load computation in this
  // app (R05/R12/R13).
  const kelasList = await prisma.kelas.findMany({
    where: {
      semesterPeriodeId: activePeriode.id,
      dosenId: { not: null },
      ...(prodiId ? { courseOffering: { prodiId } } : {}),
    },
    select: { dosenId: true, courseOffering: { select: { prodiId: true } } },
  });

  const dosenIdsByProdi = new Map<string, Set<string>>();
  const allDosenIds = new Set<string>();
  for (const k of kelasList) {
    const dosenId = k.dosenId!;
    const pid = k.courseOffering.prodiId;
    const set = dosenIdsByProdi.get(pid) ?? new Set<string>();
    set.add(dosenId);
    dosenIdsByProdi.set(pid, set);
    allDosenIds.add(dosenId);
  }

  const dosenInfo = await prisma.dosen.findMany({
    where: { id: { in: [...allDosenIds] } },
    select: { id: true, jenis: true, tingkatPendidikan: true, jfa: true },
  });
  const dosenById = new Map(dosenInfo.map((d) => [d.id, d]));

  const prodi = allProdi.map((p) => {
    const dosenIds = dosenIdsByProdi.get(p.id) ?? new Set<string>();
    const dosenForRatio = [...dosenIds]
      .map((id) => dosenById.get(id))
      .filter((d): d is NonNullable<typeof d> => d != null);
    return {
      prodiId: p.id,
      prodiKode: p.kode,
      prodiNama: p.nama,
      ...computeProdiRatios(dosenForRatio),
    };
  });

  return NextResponse.json({ activePeriode, prodi });
}
