import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canManageMasterData } from "@/lib/authz";
import { updateKelompokKeahlianSchema } from "@/lib/validation/kelompokKeahlian";

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
  const parsed = updateKelompokKeahlianSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.kelompokKeahlian.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ kelompokKeahlian: updated });
}
