import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

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

  const activePeriode = await prisma.semesterPeriode.findFirst({ where: { aktif: true } });
  if (!activePeriode) {
    return NextResponse.json({ error: "No active SemesterPeriode is configured" }, { status: 400 });
  }

  const mataKuliah = await prisma.mataKuliah.findMany({
    where: { prodiId },
    orderBy: [{ kodeMK: "asc" }],
    include: {
      courseOfferings: {
        where: { semesterPeriodeId: activePeriode.id },
        orderBy: [{ tahunAngkatan: "desc" }, { semesterKe: "asc" }],
        include: {
          kelas: {
            orderBy: { sectionSuffix: "asc" },
            include: {
              dosen: {
                select: { id: true, kode: true, nama: true, kkId: true, aktif: true },
              },
            },
          },
        },
      },
    },
  });

  return NextResponse.json({ mataKuliah, activePeriode });
}
