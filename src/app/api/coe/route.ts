import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canManageMasterData } from "@/lib/authz";
import { createCoeSchema } from "@/lib/validation/coe";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const coe = await prisma.centerOfExcellence.findMany({
    orderBy: { nama: "asc" },
  });

  return NextResponse.json({ coe });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!canManageMasterData(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createCoeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.centerOfExcellence.findUnique({
    where: { nama: parsed.data.nama },
  });
  if (existing) {
    return NextResponse.json({ error: "Nama already in use" }, { status: 409 });
  }

  const created = await prisma.centerOfExcellence.create({ data: parsed.data });
  return NextResponse.json({ coe: created }, { status: 201 });
}
