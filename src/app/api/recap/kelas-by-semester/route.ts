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
  const queryProdiId = searchParams.get("prodiId");
  // Kaprodi is always scoped to their own prodi. Ketua KK / Admin may pass
  // an optional prodiId to narrow down, or omit it to see every prodi --
  // there's no KK-based prodi restriction, since the point of this view is
  // spotting unplotted work anywhere a Ketua KK might staff (same scoping
  // already used by the Plotting board itself).
  const prodiId = user.role === "KAPRODI" ? user.prodiId : queryProdiId;

  const semesterResult = await resolveSemester(user, searchParams.get("semesterPeriodeId"));
  if (!semesterResult.ok) {
    return NextResponse.json({ error: semesterResult.error }, { status: semesterResult.status });
  }
  const activePeriode = semesterResult.semester;

  // Source from opened Kelas only, never the MK catalog (Refinement 11).
  const kelasList = await prisma.kelas.findMany({
    where: {
      semesterPeriodeId: activePeriode.id,
      ...(prodiId ? { courseOffering: { prodiId } } : {}),
    },
    orderBy: { kodeKelas: "asc" },
    include: {
      courseOffering: {
        select: {
          semesterKe: true,
          prodi: { select: { kode: true, nama: true } },
          mataKuliah: { select: { kodeMK: true, nama: true } },
        },
      },
      dosen: { select: { kode: true, nama: true } },
    },
  });

  type Item = {
    id: string;
    kodeKelas: string;
    sks: number;
    kodeMK: string;
    namaMK: string;
    prodiKode: string;
    dosen: { kode: string; nama: string } | null;
  };
  type Group = {
    semesterKe: number;
    jumlahKelas: number;
    totalSks: number;
    unassignedKelas: number;
    unassignedSks: number;
    items: Item[];
  };
  const bySemester = new Map<number, Group>();

  for (const k of kelasList) {
    const semesterKe = k.courseOffering.semesterKe;
    const group = bySemester.get(semesterKe) ?? {
      semesterKe,
      jumlahKelas: 0,
      totalSks: 0,
      unassignedKelas: 0,
      unassignedSks: 0,
      items: [],
    };
    group.jumlahKelas += 1;
    group.totalSks += k.sks;
    if (!k.dosenId) {
      group.unassignedKelas += 1;
      group.unassignedSks += k.sks;
    }
    group.items.push({
      id: k.id,
      kodeKelas: k.kodeKelas,
      sks: k.sks,
      kodeMK: k.courseOffering.mataKuliah.kodeMK,
      namaMK: k.courseOffering.mataKuliah.nama,
      prodiKode: k.courseOffering.prodi.kode,
      dosen: k.dosen,
    });
    bySemester.set(semesterKe, group);
  }

  const groups = [...bySemester.values()].sort((a, b) => a.semesterKe - b.semesterKe);

  return NextResponse.json({ groups, activePeriode });
}
