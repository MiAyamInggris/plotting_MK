import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canManageMasterData } from "@/lib/authz";
import { updateProgramStudiSchema } from "@/lib/validation/programStudi";
import { logActivity } from "@/lib/activityLog";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!canManageMasterData(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateProgramStudiSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.programStudi.update({
    where: { id },
    data: parsed.data,
  });

  await logActivity({
    user: user!,
    action: "UPDATE",
    entityType: "ProgramStudi",
    entityId: id,
    detail: updated.kode,
    request,
  });

  return NextResponse.json({ programStudi: updated });
}
