import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canManageUsers } from "@/lib/authz";

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
