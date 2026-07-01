import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { resolveSemester } from "@/lib/semester";

export type HeatmapCell = {
  semesterKe: number;
  jumlahKelas: number;
  unassignedKelas: number;
  totalSks: number;
  unassignedSks: number;
  pctComplete: number;
  items: {
    id: string;
    kodeKelas: string;
    sks: number;
    kodeMK: string;
    namaMK: string;
    dosen: { kode: string; nama: string } | null;
  }[];
};

export type HeatmapRow = {
  prodiId: string;
  prodiKode: string;
  prodiNama: string;
  cells: HeatmapCell[];
};

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const semesterResult = await resolveSemester(user, searchParams.get("semesterPeriodeId"));
  if (!semesterResult.ok) {
    return NextResponse.json({ error: semesterResult.error }, { status: semesterResult.status });
  }
  const activePeriode = semesterResult.semester;

  const kelasList = await prisma.kelas.findMany({
    where: { semesterPeriodeId: activePeriode.id },
    orderBy: { kodeKelas: "asc" },
    select: {
      id: true,
      kodeKelas: true,
      sks: true,
      dosenId: true,
      courseOffering: {
        select: {
          semesterKe: true,
          prodiId: true,
          prodi: { select: { id: true, kode: true, nama: true } },
          mataKuliah: { select: { kodeMK: true, nama: true } },
        },
      },
      dosen: { select: { kode: true, nama: true } },
    },
  });

  type ProdiEntry = {
    prodiId: string;
    prodiKode: string;
    prodiNama: string;
    cellMap: Map<number, HeatmapCell>;
  };

  const prodiMap = new Map<string, ProdiEntry>();
  const semesterSet = new Set<number>();

  for (const k of kelasList) {
    const { prodiId, semesterKe, prodi, mataKuliah } = k.courseOffering;
    semesterSet.add(semesterKe);

    if (!prodiMap.has(prodiId)) {
      prodiMap.set(prodiId, {
        prodiId,
        prodiKode: prodi.kode,
        prodiNama: prodi.nama,
        cellMap: new Map(),
      });
    }
    const entry = prodiMap.get(prodiId)!;

    if (!entry.cellMap.has(semesterKe)) {
      entry.cellMap.set(semesterKe, {
        semesterKe,
        jumlahKelas: 0,
        unassignedKelas: 0,
        totalSks: 0,
        unassignedSks: 0,
        pctComplete: 0,
        items: [],
      });
    }
    const cell = entry.cellMap.get(semesterKe)!;
    cell.jumlahKelas += 1;
    cell.totalSks += k.sks;
    if (!k.dosenId) {
      cell.unassignedKelas += 1;
      cell.unassignedSks += k.sks;
    }
    cell.items.push({
      id: k.id,
      kodeKelas: k.kodeKelas,
      sks: k.sks,
      kodeMK: mataKuliah.kodeMK,
      namaMK: mataKuliah.nama,
      dosen: k.dosen,
    });
  }

  const semesters = [...semesterSet].sort((a, b) => a - b);

  const rows: HeatmapRow[] = [...prodiMap.values()]
    .sort((a, b) => a.prodiKode.localeCompare(b.prodiKode))
    .map((pe) => ({
      prodiId: pe.prodiId,
      prodiKode: pe.prodiKode,
      prodiNama: pe.prodiNama,
      cells: semesters.map((s) => {
        const cell = pe.cellMap.get(s) ?? {
          semesterKe: s,
          jumlahKelas: 0,
          unassignedKelas: 0,
          totalSks: 0,
          unassignedSks: 0,
          pctComplete: 0,
          items: [],
        };
        return {
          ...cell,
          pctComplete:
            cell.jumlahKelas > 0
              ? Math.round(((cell.jumlahKelas - cell.unassignedKelas) / cell.jumlahKelas) * 100)
              : 0,
        };
      }),
    }));

  return NextResponse.json({ rows, semesters, activePeriode });
}
