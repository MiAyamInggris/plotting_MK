import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canEditCourses } from "@/lib/authz";
import { resolveWritableSemester } from "@/lib/semester";
import { updateCourseOfferingSchema } from "@/lib/validation/mataKuliah";

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

  return NextResponse.json({ courseOffering: updated });
}

export async function DELETE(
  _request: Request,
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

  try {
    await prisma.courseOffering.delete({ where: { id } });
  } catch {
    return NextResponse.json(
      { error: "Cannot delete: this offering still has class sections" },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true });
}
