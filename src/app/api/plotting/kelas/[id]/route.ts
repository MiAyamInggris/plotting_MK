import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canEditCourses, canPlot } from "@/lib/authz";
import { resolveWritableSemester } from "@/lib/semester";
import { assignDosenSchema, updateKelasSchema } from "@/lib/validation/plotting";
import { checkCrossProdi, checkDosenActive, checkSksCap, type RuleResult } from "@/lib/validation/rules";
import { logActivity } from "@/lib/activityLog";

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

  // Two independent operations share this endpoint: assigning/clearing a
  // dosen (Ketua KK / canPlot) and renaming a class's code (Kaprodi /
  // canEditCourses) -- distinguished by which field is present. One
  // offering = one class (Refinement 09), so renaming updates both the
  // Kelas and its parent CourseOffering's kelasPrefix together.
  if (typeof body === "object" && body !== null && "kodeKelas" in body) {
    const parsed = updateKelasSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    if (!canEditCourses(user, existing.courseOffering.prodiId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (existing.dosenId) {
      return NextResponse.json(
        { error: "Cannot edit: this class is already plotted. Clear the dosen assignment first." },
        { status: 409 },
      );
    }

    try {
      const [updated] = await prisma.$transaction([
        prisma.kelas.update({
          where: { id },
          data: { kodeKelas: parsed.data.kodeKelas },
        }),
        prisma.courseOffering.update({
          where: { id: existing.courseOfferingId },
          data: { kelasPrefix: parsed.data.kodeKelas },
        }),
      ]);
      await logActivity({
        user: user!,
        action: "UPDATE",
        entityType: "Kelas",
        entityId: id,
        detail: `Renamed to ${parsed.data.kodeKelas}`,
        request,
      });
      return NextResponse.json({ kelas: updated });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return NextResponse.json(
          { error: "A class with this code already exists for this Mata Kuliah this semester" },
          { status: 409 },
        );
      }
      throw error;
    }
  }

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
    // Beban SKS for the cap warning includes struktural load, not just
    // teaching, consistent with the Beban Dosen recap's totalBeban figure.
    const totalAfter = (existingLoad._sum.sks ?? 0) + existing.sks + (dosen.bebanStrukturalSks ?? 0);

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

  await logActivity({
    user: user!,
    action: dosen ? "PLOT_ASSIGN" : "PLOT_CLEAR",
    entityType: "Kelas",
    entityId: id,
    detail: dosen ? dosen.kode : null,
    request,
  });

  return NextResponse.json({ kelas: updated, warnings });
}
