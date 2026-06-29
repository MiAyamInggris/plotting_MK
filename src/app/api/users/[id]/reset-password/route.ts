import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canManageUsers } from "@/lib/authz";
import { deriveDefaultPassword } from "@/lib/dosenAccounts";
import { logActivity } from "@/lib/activityLog";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!canManageUsers(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.user.findUnique({
    where: { id },
    include: { dosen: { select: { kode: true, nipYpt: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!existing.dosen || !existing.dosen.nipYpt) {
    return NextResponse.json(
      { error: "Cannot reset: no NIP on file for this dosen to derive a default password from" },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(deriveDefaultPassword(existing.dosen.nipYpt), 10);
  await prisma.user.update({
    where: { id },
    data: { passwordHash, mustChangePassword: true },
  });

  await logActivity({
    user: user!,
    action: "PASSWORD_RESET",
    entityType: "User",
    entityId: id,
    detail: `Reset to NIP-based default for ${existing.dosen.kode}`,
    request,
  });

  return NextResponse.json({ success: true });
}
