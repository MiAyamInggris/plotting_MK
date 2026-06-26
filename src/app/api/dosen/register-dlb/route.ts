import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canRegisterDlb } from "@/lib/authz";
import { registerDlbSchema } from "@/lib/validation/dosen";

function randomKode(): string {
  const digits = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0");
  return `DLB${digits}`;
}

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

  if (parsed.data.email) {
    const existingEmail = await prisma.dosen.findUnique({ where: { email: parsed.data.email } });
    if (existingEmail) {
      return NextResponse.json({ error: "Email already in use by another dosen" }, { status: 409 });
    }
  }

  let created = null;
  for (let attempt = 0; attempt < 5 && !created; attempt++) {
    try {
      created = await prisma.dosen.create({
        data: {
          kode: randomKode(),
          nama: parsed.data.nama,
          namaTanpaGelar: parsed.data.nama,
          email: parsed.data.email || null,
          kkId,
          jenis: "DLB",
          createdById: user!.id,
        },
        select: { id: true, kode: true, nama: true, kkId: true, aktif: true, jenis: true },
      });
    } catch (e) {
      const isUniqueKodeCollision =
        typeof e === "object" && e !== null && "code" in e && e.code === "P2002";
      if (!isUniqueKodeCollision || attempt === 4) throw e;
    }
  }

  return NextResponse.json({ dosen: created }, { status: 201 });
}
