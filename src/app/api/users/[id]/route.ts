import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canManageUsers } from "@/lib/authz";
import { updateUserSchema } from "@/lib/validation/user";
import { logActivity } from "@/lib/activityLog";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!canManageUsers(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, password, role, prodiId, kkId, aktif } = parsed.data;

  const finalRole = role ?? existing.role;
  const finalProdiId = prodiId !== undefined ? prodiId : existing.prodiId;
  const finalKkId = kkId !== undefined ? kkId : existing.kkId;

  if (finalRole === "KAPRODI" && !finalProdiId) {
    return NextResponse.json(
      { error: "Kaprodi must be bound to a Program Studi" },
      { status: 400 },
    );
  }
  if (finalRole === "KETUA_KK" && !finalKkId) {
    return NextResponse.json(
      { error: "Ketua KK must be bound to a Kelompok Keahlian" },
      { status: 400 },
    );
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      name,
      aktif,
      passwordHash: password ? await bcrypt.hash(password, 10) : undefined,
      role: finalRole,
      prodiId: finalRole === "KAPRODI" ? finalProdiId : null,
      kkId: finalRole === "KETUA_KK" ? finalKkId : null,
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

  await logActivity({
    user: user!,
    action: role ? "ROLE_CHANGE" : "UPDATE",
    entityType: "User",
    entityId: id,
    detail: role ? `Role changed to ${role}` : undefined,
    request,
  });

  return NextResponse.json({ user: updated });
}
