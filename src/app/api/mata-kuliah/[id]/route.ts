import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canEditCourses } from "@/lib/authz";
import { updateMataKuliahSchema } from "@/lib/validation/mataKuliah";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  const { id } = await params;

  const existing = await prisma.mataKuliah.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Mata Kuliah not found" }, { status: 404 });
  }
  if (!canEditCourses(user, existing.prodiId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateMataKuliahSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.mataKuliah.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ mataKuliah: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  const { id } = await params;

  const existing = await prisma.mataKuliah.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Mata Kuliah not found" }, { status: 404 });
  }
  if (!canEditCourses(user, existing.prodiId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await prisma.mataKuliah.delete({ where: { id } });
  } catch {
    return NextResponse.json(
      { error: "Cannot delete: this Mata Kuliah still has course offerings" },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true });
}
