import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canEditCourses } from "@/lib/authz";
import { resolveWritableSemester } from "@/lib/semester";
import { updateCourseOfferingSchema } from "@/lib/validation/mataKuliah";
import { logActivity } from "@/lib/activityLog";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  const { id } = await params;

  const existing = await prisma.courseOffering.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Course offering not found" }, { status: 404 });
  }
  if (!canEditCourses(user, existing.prodiId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const semesterResult = await resolveWritableSemester(user, existing.semesterPeriodeId);
  if (!semesterResult.ok) {
    return NextResponse.json({ error: semesterResult.error }, { status: semesterResult.status });
  }

  const body = await request.json();
  const parsed = updateCourseOfferingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.courseOffering.update({
    where: { id },
    data: parsed.data,
    include: { kelas: true },
  });

  await logActivity({
    user: user!,
    action: "UPDATE",
    entityType: "CourseOffering",
    entityId: id,
    request,
  });

  return NextResponse.json({ courseOffering: updated });
}

// One offering = one class (Refinement 09) -- removing a class IS removing
// its offering, so this single endpoint serves as both "un-open" and
// "remove class".
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  const { id } = await params;

  const existing = await prisma.courseOffering.findUnique({
    where: { id },
    include: { kelas: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Course offering not found" }, { status: 404 });
  }
  if (!canEditCourses(user, existing.prodiId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (existing.kelas.some((k) => k.dosenId)) {
    return NextResponse.json(
      { error: "Cannot remove: this class is already plotted. Clear the dosen assignment first." },
      { status: 409 },
    );
  }

  const semesterResult = await resolveWritableSemester(user, existing.semesterPeriodeId);
  if (!semesterResult.ok) {
    return NextResponse.json({ error: semesterResult.error }, { status: semesterResult.status });
  }

  await prisma.$transaction([
    prisma.kelas.deleteMany({ where: { courseOfferingId: id } }),
    prisma.courseOffering.delete({ where: { id } }),
  ]);

  await logActivity({
    user: user!,
    action: "DELETE",
    entityType: "CourseOffering",
    entityId: id,
    request,
  });

  return NextResponse.json({ ok: true });
}
