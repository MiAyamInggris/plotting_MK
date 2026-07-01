import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canCreateDosen } from "@/lib/authz";
import { createDosenSchema } from "@/lib/validation/dosen";
import { logActivity } from "@/lib/activityLog";

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
      { email: { contains: search, mode: "insensitive" } },
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
      user: { select: { id: true, role: true, prodiId: true, kkId: true, aktif: true } },
      createdBy: { select: { name: true } },
    },
  });

  return NextResponse.json({ dosen });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createDosenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const authResult = canCreateDosen(user, parsed.data.jenis ?? "TETAP");
  if (!authResult.allowed) {
    return NextResponse.json({ error: authResult.reason ?? "Forbidden" }, { status: 403 });
  }

  const existingKode = await prisma.dosen.findUnique({
    where: { kode: parsed.data.kode },
  });
  if (existingKode) {
    return NextResponse.json({ error: "Kode dosen already in use" }, { status: 409 });
  }

  if (parsed.data.email) {
    const existingEmail = await prisma.dosen.findUnique({
      where: { email: parsed.data.email },
    });
    if (existingEmail) {
      return NextResponse.json({ error: "Email already in use by another dosen" }, { status: 409 });
    }
  }

  const { tmtJfa, namaTanpaGelar, ...rest } = parsed.data;
  const created = await prisma.dosen.create({
    data: {
      ...rest,
      // DLB forms omit namaTanpaGelar — fall back to nama automatically
      namaTanpaGelar: namaTanpaGelar || parsed.data.nama,
      tmtJfa: tmtJfa ? new Date(tmtJfa) : null,
      // KK: stamp their own KK and creator; DLB form doesn't send these fields
      ...(user.role === "KETUA_KK"
        ? { kkId: user.kkId, createdById: user.id }
        : {}),
    },
  });

  const isKk = user.role === "KETUA_KK";
  await logActivity({
    user,
    action: isKk ? "DLB_CREATE" : "CREATE",
    entityType: "Dosen",
    entityId: created.id,
    detail: isKk ? `${created.kode} — ${created.nama}` : created.kode,
    request,
  });

  return NextResponse.json({ dosen: created }, { status: 201 });
}
