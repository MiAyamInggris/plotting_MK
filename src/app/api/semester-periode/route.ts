import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canManageSemesters } from "@/lib/authz";
import { listSemestersFor } from "@/lib/semester";
import { createSemesterPeriodeSchema } from "@/lib/validation/semesterPeriode";
import { logActivity } from "@/lib/activityLog";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const semesterPeriode = await listSemestersFor(user);
  return NextResponse.json({ semesterPeriode });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!canManageSemesters(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createSemesterPeriodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const created = await prisma.semesterPeriode.create({
    data: { ...parsed.data, aktif: false, visibleToScopedRoles: false },
  });

  await logActivity({
    user: user!,
    action: "CREATE",
    entityType: "SemesterPeriode",
    entityId: created.id,
    detail: created.nama,
    request,
  });

  return NextResponse.json({ semesterPeriode: created }, { status: 201 });
}
