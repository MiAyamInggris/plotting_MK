import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canManageUsers } from "@/lib/authz";
import { createUserSchema } from "@/lib/validation/user";

export async function GET() {
  const user = await getSessionUser();
  if (!canManageUsers(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      prodiId: true,
      kkId: true,
      aktif: true,
      createdAt: true,
      updatedAt: true,
      prodi: { select: { nama: true, kode: true } },
      kk: { select: { nama: true } },
    },
  });

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!canManageUsers(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { email, name, password, role, prodiId, kkId } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const created = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role,
      prodiId: role === "KAPRODI" ? prodiId : null,
      kkId: role === "KETUA_KK" ? kkId : null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      prodiId: true,
      kkId: true,
      aktif: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ user: created }, { status: 201 });
}
