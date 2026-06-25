import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canManageMasterData } from "@/lib/authz";
import { resolveWritableSemester } from "@/lib/semester";
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

  const semesterResult = await resolveWritableSemester(user, parsed.data.semesterPeriodeId);
  if (!semesterResult.ok) {
    return NextResponse.json({ error: semesterResult.error }, { status: semesterResult.status });
  }
  const { semester } = semesterResult;

  const target = await prisma.prodiTarget.upsert({
    where: {
      prodiId_semesterPeriodeId: {
        prodiId: parsed.data.prodiId,
        semesterPeriodeId: semester.id,
      },
    },
    update: { kebutuhanSks: parsed.data.kebutuhanSks },
    create: {
      prodiId: parsed.data.prodiId,
      semesterPeriodeId: semester.id,
      kebutuhanSks: parsed.data.kebutuhanSks,
    },
  });

  return NextResponse.json({ prodiTarget: target });
}
