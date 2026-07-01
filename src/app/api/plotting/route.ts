import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { resolveSemester } from "@/lib/semester";

type MataKuliahPayload = {
  id: string;
  kodeMK: string;
  nama: string;
  sks: number;
  ket: string | null;
  courseOfferings: {
    id: string;
    semesterKe: number;
    tahunAngkatan: number;
    kelas: {
      id: string;
      kodeKelas: string;
      sks: number;
      dosenId: string | null;
      dosen: { id: string; kode: string; nama: string; kkId: string | null; aktif: boolean } | null;
      assignedBy: { name: string; role: string } | null;
    }[];
  }[];
};

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const prodiId = searchParams.get("prodiId");
  if (!prodiId) {
    return NextResponse.json({ error: "prodiId is required" }, { status: 400 });
  }
  const onlyOpened = searchParams.get("onlyOpened") === "true";

  const semesterResult = await resolveSemester(user, searchParams.get("semesterPeriodeId"));
  if (!semesterResult.ok) {
    return NextResponse.json({ error: semesterResult.error }, { status: semesterResult.status });
  }
  const { semester } = semesterResult;

  const prodi = await prisma.programStudi.findUnique({
    where: { id: prodiId },
    select: { id: true, kode: true, nama: true },
  });
  if (!prodi) {
    return NextResponse.json({ error: "Program Studi not found" }, { status: 404 });
  }

  let mataKuliah: MataKuliahPayload[];

  if (onlyOpened) {
    // Ketua KK board (Refinement 11): derive from the opened Kelas, never
    // from the MataKuliah catalog -- a catalog row with no opened class
    // this semester must never appear here, unlike the Kaprodi-facing
    // default branch below which intentionally lists the whole catalog.
    const kelasList = await prisma.kelas.findMany({
      where: {
        semesterPeriodeId: semester.id,
        courseOffering: { prodiId },
      },
      orderBy: { kodeKelas: "asc" },
      include: {
        courseOffering: { include: { mataKuliah: true } },
        dosen: { select: { id: true, kode: true, nama: true, kkId: true, aktif: true } },
        assignedBy: { select: { name: true, role: true } },
      },
    });

    const byMk = new Map<string, MataKuliahPayload>();
    for (const k of kelasList) {
      const mk = k.courseOffering.mataKuliah;
      let entry = byMk.get(mk.id);
      if (!entry) {
        entry = { id: mk.id, kodeMK: mk.kodeMK, nama: mk.nama, sks: mk.sks, ket: mk.ket, courseOfferings: [] };
        byMk.set(mk.id, entry);
      }
      entry.courseOfferings.push({
        id: k.courseOfferingId,
        semesterKe: k.courseOffering.semesterKe,
        tahunAngkatan: k.courseOffering.tahunAngkatan,
        kelas: [
          {
            id: k.id,
            kodeKelas: k.kodeKelas,
            sks: k.sks,
            dosenId: k.dosenId,
            dosen: k.dosen,
            assignedBy: k.assignedBy,
          },
        ],
      });
    }
    mataKuliah = [...byMk.values()];
  } else {
    mataKuliah = await prisma.mataKuliah.findMany({
      where: { prodiId },
      orderBy: [{ kodeMK: "asc" }],
      include: {
        courseOfferings: {
          where: { semesterPeriodeId: semester.id },
          orderBy: [{ tahunAngkatan: "desc" }, { semesterKe: "asc" }],
          include: {
            kelas: {
              orderBy: { sectionSuffix: "asc" },
              include: {
                dosen: {
                  select: { id: true, kode: true, nama: true, kkId: true, aktif: true },
                },
                assignedBy: { select: { name: true, role: true } },
              },
            },
          },
        },
      },
    });
  }

  return NextResponse.json({ prodi, mataKuliah, activePeriode: semester, canWrite: semesterResult.canWrite });
}
