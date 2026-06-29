import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canRegisterDlb } from "@/lib/authz";
import { registerDlbSchema } from "@/lib/validation/dosen";
import { logActivity } from "@/lib/activityLog";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!canRegisterDlb(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = registerDlbSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let kkId: string;
  if (user!.role === "KETUA_KK") {
    if (!user!.kkId) {
      return NextResponse.json(
        { error: "Your account has no Kelompok Keahlian bound" },
        { status: 400 },
      );
    }
    kkId = user!.kkId;
  } else {
    if (!parsed.data.kkId) {
      return NextResponse.json({ error: "kkId is required" }, { status: 400 });
    }
    kkId = parsed.data.kkId;
  }

  const existingKode = await prisma.dosen.findUnique({ where: { kode: parsed.data.kode } });
  if (existingKode) {
    return NextResponse.json({ error: "Kode dosen already in use" }, { status: 409 });
  }

  const existingEmail = await prisma.dosen.findUnique({ where: { email: parsed.data.email } });
  if (existingEmail) {
    return NextResponse.json({ error: "Email already in use by another dosen" }, { status: 409 });
  }

  const created = await prisma.dosen.create({
    data: {
      kode: parsed.data.kode,
      nama: parsed.data.nama,
      namaTanpaGelar: parsed.data.nama,
      email: parsed.data.email,
      nidn: parsed.data.nidn,
      noTelp: parsed.data.noTelp,
      jfa: parsed.data.jfa,
      homebaseUniv: parsed.data.homebaseUniv,
      kkId,
      jenis: "DLB",
      createdById: user!.id,
    },
    select: { id: true, kode: true, nama: true, kkId: true, aktif: true, jenis: true },
  });

  await logActivity({
    user: user!,
    action: "DLB_CREATE",
    entityType: "Dosen",
    entityId: created.id,
    detail: created.kode,
    request,
  });

  return NextResponse.json({ dosen: created }, { status: 201 });
}
