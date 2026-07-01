import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canManageMasterData, canEditDosen } from "@/lib/authz";
import { updateDosenSchema } from "@/lib/validation/dosen";
import { logActivity } from "@/lib/activityLog";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  const { id } = await params;

  const existing = await prisma.dosen.findUnique({
    where: { id },
    select: { jenis: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Dosen not found" }, { status: 404 });
  }

  const authResult = canEditDosen(user, existing);
  if (!authResult.allowed) {
    return NextResponse.json({ error: authResult.reason ?? "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateDosenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.email) {
    const existingEmail = await prisma.dosen.findUnique({
      where: { email: parsed.data.email },
    });
    if (existingEmail && existingEmail.id !== id) {
      return NextResponse.json({ error: "Email already in use by another dosen" }, { status: 409 });
    }
  }

  let updated;
  if (canManageMasterData(user)) {
    // Admin: apply all fields from the schema
    const { tmtJfa, ...rest } = parsed.data;
    updated = await prisma.dosen.update({
      where: { id },
      data: {
        ...rest,
        tmtJfa: tmtJfa !== undefined ? (tmtJfa ? new Date(tmtJfa) : null) : undefined,
      },
    });
  } else {
    // Ketua KK: restrict to DLB-safe fields only; auto-sync namaTanpaGelar
    const { kode, nama, email, nidn, noTelp, jfa, homebaseUniv } = parsed.data;
    updated = await prisma.dosen.update({
      where: { id },
      data: {
        ...(kode !== undefined ? { kode } : {}),
        ...(nama !== undefined ? { nama, namaTanpaGelar: nama } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(nidn !== undefined ? { nidn } : {}),
        ...(noTelp !== undefined ? { noTelp } : {}),
        ...(jfa !== undefined ? { jfa } : {}),
        ...(homebaseUniv !== undefined ? { homebaseUniv } : {}),
      },
    });
  }

  await logActivity({
    user: user!,
    action: "UPDATE",
    entityType: "Dosen",
    entityId: id,
    detail: updated.kode,
    request,
  });

  return NextResponse.json({ dosen: updated });
}
