import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canManageSemesters } from "@/lib/authz";
import { updateSemesterPeriodeSchema } from "@/lib/validation/semesterPeriode";
import { logActivity } from "@/lib/activityLog";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!canManageSemesters(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.semesterPeriode.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Semester not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateSemesterPeriodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { aktif, ...rest } = parsed.data;

  if (aktif === false && existing.aktif) {
    return NextResponse.json(
      {
        error:
          "Activate a different semester instead — there must always be exactly one active semester.",
      },
      { status: 400 },
    );
  }

  if (aktif === true) {
    const [, updated] = await prisma.$transaction([
      prisma.semesterPeriode.updateMany({
        where: { id: { not: id }, aktif: true },
        data: { aktif: false },
      }),
      prisma.semesterPeriode.update({
        where: { id },
        data: { ...rest, aktif: true },
      }),
    ]);
    await logActivity({
      user: user!,
      action: "UPDATE",
      entityType: "SemesterPeriode",
      entityId: id,
      detail: `Activated ${updated.nama}`,
      request,
    });
    return NextResponse.json({ semesterPeriode: updated });
  }

  const updated = await prisma.semesterPeriode.update({
    where: { id },
    data: rest,
  });

  await logActivity({
    user: user!,
    action: "UPDATE",
    entityType: "SemesterPeriode",
    entityId: id,
    detail: updated.nama,
    request,
  });

  return NextResponse.json({ semesterPeriode: updated });
}
