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

  // A dosen can only ever look up their own load, regardless of any kode
  // query param they pass — every other role searches freely by kode.
  const isSelfLookup = user.role === "DOSEN";
  let dosenWhere: { id: string } | { kode: string };
  if (isSelfLookup) {
    if (!user.dosenId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    dosenWhere = { id: user.dosenId };
  } else {
    const kode = searchParams.get("kode")?.toUpperCase();
    if (!kode) {
      return NextResponse.json({ error: "kode is required" }, { status: 400 });
    }
    dosenWhere = { kode };
  }

  const semesterResult = await resolveSemester(user, searchParams.get("semesterPeriodeId"));
  if (!semesterResult.ok) {
    return NextResponse.json({ error: semesterResult.error }, { status: semesterResult.status });
  }
  const activePeriode = semesterResult.semester;

  const dosen = await prisma.dosen.findUnique({
    where: dosenWhere,
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
  if (!dosen) {
    return NextResponse.json(
      { error: isSelfLookup ? "Dosen profile not found" : `Dosen not found` },
      { status: 404 },
    );
  }

  const kelasList = await prisma.kelas.findMany({
    where: { dosenId: dosen.id, semesterPeriodeId: activePeriode.id },
    include: {
      courseOffering: {
        select: {
          semesterKe: true,
          tahunAngkatan: true,
          prodi: { select: { kode: true, nama: true } },
          mataKuliah: { select: { kodeMK: true, nama: true } },
        },
      },
    },
  });

  const byProdi = new Map<
    string,
    {
      prodiKode: string;
      prodiNama: string;
      sks: number;
      kelas: {
        id: string;
        kodeMK: string;
        namaMK: string;
        kodeKelas: string;
        sks: number;
        semesterKe: number;
        tahunAngkatan: number;
      }[];
    }
  >();

  for (const k of kelasList) {
    const prodiKode = k.courseOffering.prodi.kode;
    const entry = byProdi.get(prodiKode) ?? {
      prodiKode,
      prodiNama: k.courseOffering.prodi.nama,
      sks: 0,
      kelas: [],
    };
    entry.sks += k.sks;
    entry.kelas.push({
      id: k.id,
      kodeMK: k.courseOffering.mataKuliah.kodeMK,
      namaMK: k.courseOffering.mataKuliah.nama,
      // The same kodeKelas (cohort/section identifier) often hosts several
      // different courses, so it is not a unique row identifier on its own.
      kodeKelas: k.kodeKelas,
      sks: k.sks,
      semesterKe: k.courseOffering.semesterKe,
      tahunAngkatan: k.courseOffering.tahunAngkatan,
    });
    byProdi.set(prodiKode, entry);
  }

  const distinctMataKuliah = new Set(kelasList.map((k) => k.courseOffering.mataKuliah.kodeMK));

  return NextResponse.json({
    dosen: {
      kode: dosen.kode,
      nama: dosen.nama,
      jfa: dosen.jfa,
      bebanStruktural: dosen.bebanStruktural,
      kk: dosen.kk?.nama ?? null,
      homebaseProdi: dosen.homebaseProdi?.kode ?? null,
    },
    totalSks: kelasList.reduce((sum, k) => sum + k.sks, 0),
    jumlahKelas: kelasList.length,
    jumlahMK: distinctMataKuliah.size,
    byProdi: [...byProdi.values()],
  });
}
