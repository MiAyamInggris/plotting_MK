import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canManageMasterData } from "@/lib/authz";
import { updateDosenSchema } from "@/lib/validation/dosen";

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
  const parsed = updateDosenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { tmtJfa, ...rest } = parsed.data;
  const updated = await prisma.dosen.update({
    where: { id },
    data: {
      ...rest,
      tmtJfa: tmtJfa !== undefined ? (tmtJfa ? new Date(tmtJfa) : null) : undefined,
    },
  });

  return NextResponse.json({ dosen: updated });
}
