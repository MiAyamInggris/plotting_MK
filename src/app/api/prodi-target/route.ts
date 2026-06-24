import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canManageMasterData } from "@/lib/authz";
import { setProdiTargetSchema } from "@/lib/validation/prodiTarget";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!canManageMasterData(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = setProdiTargetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const activePeriode = await prisma.semesterPeriode.findFirst({ where: { aktif: true } });
  if (!activePeriode) {
    return NextResponse.json({ error: "No active SemesterPeriode is configured" }, { status: 400 });
  }

  const target = await prisma.prodiTarget.upsert({
    where: {
      prodiId_semesterPeriodeId: {
        prodiId: parsed.data.prodiId,
        semesterPeriodeId: activePeriode.id,
      },
    },
    update: { kebutuhanSks: parsed.data.kebutuhanSks },
    create: {
      prodiId: parsed.data.prodiId,
      semesterPeriodeId: activePeriode.id,
      kebutuhanSks: parsed.data.kebutuhanSks,
    },
  });

  return NextResponse.json({ prodiTarget: target });
}
