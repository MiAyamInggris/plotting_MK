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
  const prodiId = searchParams.get("prodiId");
  if (!prodiId) {
    return NextResponse.json({ error: "prodiId is required" }, { status: 400 });
  }

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

  const mataKuliah = await prisma.mataKuliah.findMany({
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
              assignedBy: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  return NextResponse.json({ prodi, mataKuliah, activePeriode: semester, canWrite: semesterResult.canWrite });
}
