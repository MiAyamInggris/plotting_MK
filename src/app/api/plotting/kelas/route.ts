import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canManageSections } from "@/lib/authz";
import { createKelasSchema } from "@/lib/validation/plotting";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!canManageSections(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createKelasSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const courseOffering = await prisma.courseOffering.findUnique({
    where: { id: parsed.data.courseOfferingId },
    include: { mataKuliah: true },
  });
  if (!courseOffering) {
    return NextResponse.json({ error: "Course offering not found" }, { status: 404 });
  }

  const kodeKelas = `${courseOffering.kelasPrefix}${parsed.data.sectionSuffix}`;

  try {
    const created = await prisma.kelas.create({
      data: {
        courseOfferingId: courseOffering.id,
        kodeKelas,
        sectionSuffix: parsed.data.sectionSuffix,
        sks: courseOffering.mataKuliah.sks,
      },
      include: { dosen: { select: { id: true, kode: true, nama: true, kkId: true, aktif: true } } },
    });
    return NextResponse.json({ kelas: created }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "A section with this suffix already exists for this offering" },
        { status: 409 },
      );
    }
    throw error;
  }
}
