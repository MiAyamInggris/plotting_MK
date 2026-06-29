import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canManageMasterData } from "@/lib/authz";
import { createProgramStudiSchema } from "@/lib/validation/programStudi";
import { logActivity } from "@/lib/activityLog";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const programStudi = await prisma.programStudi.findMany({
    orderBy: { kode: "asc" },
  });

  return NextResponse.json({ programStudi });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!canManageMasterData(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createProgramStudiSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.programStudi.findUnique({
    where: { kode: parsed.data.kode },
  });
  if (existing) {
    return NextResponse.json({ error: "Kode already in use" }, { status: 409 });
  }

  const created = await prisma.programStudi.create({ data: parsed.data });
  await logActivity({
    user: user!,
    action: "CREATE",
    entityType: "ProgramStudi",
    entityId: created.id,
    detail: created.kode,
    request,
  });
  return NextResponse.json({ programStudi: created }, { status: 201 });
}
