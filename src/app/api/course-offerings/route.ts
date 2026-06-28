import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canEditCourses } from "@/lib/authz";
import { resolveWritableSemester } from "@/lib/semester";
import { createCourseOfferingSchema } from "@/lib/validation/mataKuliah";

export async function POST(request: Request) {
  const user = await getSessionUser();
  const body = await request.json();
  const parsed = createCourseOfferingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const mataKuliah = await prisma.mataKuliah.findUnique({
    where: { id: parsed.data.mataKuliahId },
  });
  if (!mataKuliah) {
    return NextResponse.json({ error: "Mata Kuliah not found" }, { status: 404 });
  }
  if (!canEditCourses(user, mataKuliah.prodiId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const semesterResult = await resolveWritableSemester(user, parsed.data.semesterPeriodeId);
  if (!semesterResult.ok) {
    return NextResponse.json({ error: semesterResult.error }, { status: semesterResult.status });
  }
  const { semester } = semesterResult;

  try {
    // One offering = one class (Refinement 09): created together so there's
    // never a 0- or multi-class offering. sectionSuffix is a fixed internal
    // placeholder -- kodeKelas (== kelasPrefix here) is the only code shown.
    const created = await prisma.courseOffering.create({
      data: {
        mataKuliahId: parsed.data.mataKuliahId,
        semesterKe: parsed.data.semesterKe,
        tahunAngkatan: parsed.data.tahunAngkatan,
        kelasPrefix: parsed.data.kodeKelas,
        prodiId: mataKuliah.prodiId,
        semesterPeriodeId: semester.id,
        kelas: {
          create: {
            semesterPeriodeId: semester.id,
            kodeKelas: parsed.data.kodeKelas,
            sectionSuffix: "1",
            sks: mataKuliah.sks,
          },
        },
      },
      include: { kelas: true },
    });

    return NextResponse.json({ courseOffering: created }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "A class with this code already exists for this Mata Kuliah this semester" },
        { status: 409 },
      );
    }
    throw error;
  }
}
