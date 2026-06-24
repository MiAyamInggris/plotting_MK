import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canEditCourses } from "@/lib/authz";
import { createMataKuliahSchema } from "@/lib/validation/mataKuliah";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const queryProdiId = searchParams.get("prodiId");

  // Kaprodi is always scoped to their own prodi, regardless of the query param.
  const prodiId = user.role === "KAPRODI" ? user.prodiId : queryProdiId;

  const mataKuliah = await prisma.mataKuliah.findMany({
    where: prodiId ? { prodiId } : undefined,
    orderBy: [{ prodiId: "asc" }, { kodeMK: "asc" }],
    include: {
      prodi: { select: { kode: true, nama: true } },
      courseOfferings: {
        orderBy: [{ tahunAngkatan: "desc" }, { semesterKe: "asc" }],
        include: { kelas: true },
      },
    },
  });

  return NextResponse.json({ mataKuliah });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  const body = await request.json();
  const parsed = createMataKuliahSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (!canEditCourses(user, parsed.data.prodiId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.mataKuliah.findUnique({
    where: { kodeMK_prodiId: { kodeMK: parsed.data.kodeMK, prodiId: parsed.data.prodiId } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Kode MK already exists for this Program Studi" },
      { status: 409 },
    );
  }

  const created = await prisma.mataKuliah.create({ data: parsed.data });
  return NextResponse.json({ mataKuliah: created }, { status: 201 });
}
