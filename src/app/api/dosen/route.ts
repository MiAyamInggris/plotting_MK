import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canManageMasterData } from "@/lib/authz";
import { createDosenSchema } from "@/lib/validation/dosen";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const kkId = searchParams.get("kkId");
  const homebaseProdiId = searchParams.get("homebaseProdiId");
  const jfa = searchParams.get("jfa");
  const coeId = searchParams.get("coeId");
  const tingkatPendidikan = searchParams.get("tingkatPendidikan");
  const aktif = searchParams.get("aktif");

  const where: Prisma.DosenWhereInput = {};
  if (search) {
    where.OR = [
      { kode: { contains: search, mode: "insensitive" } },
      { nama: { contains: search, mode: "insensitive" } },
      { namaTanpaGelar: { contains: search, mode: "insensitive" } },
    ];
  }
  if (kkId) where.kkId = kkId;
  if (homebaseProdiId) where.homebaseProdiId = homebaseProdiId;
  if (jfa) where.jfa = jfa;
  if (coeId) where.coeId = coeId;
  if (tingkatPendidikan) {
    where.tingkatPendidikan = tingkatPendidikan as Prisma.DosenWhereInput["tingkatPendidikan"];
  }
  if (aktif !== null && aktif !== "") where.aktif = aktif === "true";

  const dosen = await prisma.dosen.findMany({
    where,
    orderBy: { kode: "asc" },
    include: {
      homebaseProdi: { select: { kode: true, nama: true } },
      kk: { select: { nama: true } },
      coe: { select: { nama: true } },
    },
  });

  return NextResponse.json({ dosen });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!canManageMasterData(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createDosenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.dosen.findUnique({
    where: { kode: parsed.data.kode },
  });
  if (existing) {
    return NextResponse.json({ error: "Kode dosen already in use" }, { status: 409 });
  }

  const { tmtJfa, ...rest } = parsed.data;
  const created = await prisma.dosen.create({
    data: {
      ...rest,
      tmtJfa: tmtJfa ? new Date(tmtJfa) : null,
    },
  });

  return NextResponse.json({ dosen: created }, { status: 201 });
}
