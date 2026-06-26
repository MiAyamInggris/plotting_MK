import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canManageSections, canPlot } from "@/lib/authz";
import { resolveWritableSemester } from "@/lib/semester";
import { assignDosenSchema } from "@/lib/validation/plotting";
import { checkCrossProdi, checkDosenActive, checkSksCap, type RuleResult } from "@/lib/validation/rules";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  const { id } = await params;

  const existing = await prisma.kelas.findUnique({
    where: { id },
    include: { courseOffering: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Kelas not found" }, { status: 404 });
  }

  const semesterResult = await resolveWritableSemester(user, existing.semesterPeriodeId);
  if (!semesterResult.ok) {
    return NextResponse.json({ error: semesterResult.error }, { status: semesterResult.status });
  }

  const body = await request.json();
  const parsed = assignDosenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const dosen = parsed.data.dosenId
    ? await prisma.dosen.findUnique({ where: { id: parsed.data.dosenId } })
    : null;

  if (parsed.data.dosenId && !dosen) {
    return NextResponse.json({ error: "Dosen not found" }, { status: 404 });
  }

  const authResult = canPlot(user, dosen);
  if (!authResult.allowed) {
    return NextResponse.json({ error: authResult.reason ?? "Forbidden" }, { status: 403 });
  }

  const warnings: RuleResult[] = [];

  if (dosen) {
    const inactiveCheck = checkDosenActive(dosen);
    if (inactiveCheck) {
      return NextResponse.json({ error: inactiveCheck.message }, { status: 400 });
    }

    const existingLoad = await prisma.kelas.aggregate({
      where: {
        dosenId: dosen.id,
        id: { not: existing.id },
        semesterPeriodeId: existing.semesterPeriodeId,
      },
      _sum: { sks: true },
    });
    const totalAfter = (existingLoad._sum.sks ?? 0) + existing.sks;

    const capCheck = checkSksCap(dosen.kode, totalAfter);
    if (capCheck) warnings.push(capCheck);

    const prodiCheck = checkCrossProdi(dosen.kode, dosen.homebaseProdiId, existing.courseOffering.prodiId);
    if (prodiCheck) warnings.push(prodiCheck);
  }

  const updated = await prisma.kelas.update({
    where: { id },
    data: {
      dosenId: dosen?.id ?? null,
      assignedById: dosen ? user!.id : null,
      assignedAt: dosen ? new Date() : null,
    },
    include: {
      dosen: { select: { id: true, kode: true, nama: true, kkId: true, aktif: true } },
      assignedBy: { select: { name: true } },
    },
  });

  return NextResponse.json({ kelas: updated, warnings });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!canManageSections(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.kelas.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Kelas not found" }, { status: 404 });
  }

  const semesterResult = await resolveWritableSemester(user, existing.semesterPeriodeId);
  if (!semesterResult.ok) {
    return NextResponse.json({ error: semesterResult.error }, { status: semesterResult.status });
  }

  await prisma.kelas.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
