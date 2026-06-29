import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  IMPERSONATION_COOKIE,
  impersonationCookieValue,
  type ImpersonationState,
} from "@/lib/impersonation";
import { startImpersonationSchema } from "@/lib/validation/impersonation";

// These two checks the *real* role directly off auth(), never through the
// overlaid getSessionUser() -- an already-impersonated session must never
// be able to manage its own impersonation state.
async function requireRealAdmin() {
  const session = await auth();
  return session?.user?.role === "ADMIN" ? session.user : null;
}

export async function POST(request: Request) {
  const realUser = await requireRealAdmin();
  if (!realUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = startImpersonationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { role } = parsed.data;

  let prodiId: string | null = null;
  let kkId: string | null = null;
  let scopeLabel: string | null = null;

  if (role === "KAPRODI") {
    if (!parsed.data.prodiId) {
      return NextResponse.json({ error: "prodiId is required for Kaprodi" }, { status: 400 });
    }
    const prodi = await prisma.programStudi.findUnique({
      where: { id: parsed.data.prodiId },
      select: { id: true, kode: true, nama: true },
    });
    if (!prodi) {
      return NextResponse.json({ error: "Program Studi not found" }, { status: 404 });
    }
    prodiId = prodi.id;
    scopeLabel = `${prodi.kode} — ${prodi.nama}`;
  } else if (role === "KETUA_KK") {
    if (!parsed.data.kkId) {
      return NextResponse.json({ error: "kkId is required for Ketua KK" }, { status: 400 });
    }
    const kk = await prisma.kelompokKeahlian.findUnique({
      where: { id: parsed.data.kkId },
      select: { id: true, nama: true },
    });
    if (!kk) {
      return NextResponse.json({ error: "Kelompok Keahlian not found" }, { status: 404 });
    }
    kkId = kk.id;
    scopeLabel = kk.nama;
  }
  // ACADEMIC needs no scope.

  const state: ImpersonationState = { role, prodiId, kkId, scopeLabel };
  const response = NextResponse.json({ success: true, state });
  response.cookies.set(IMPERSONATION_COOKIE, impersonationCookieValue(state), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return response;
}

export async function DELETE() {
  const realUser = await requireRealAdmin();
  if (!realUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const response = NextResponse.json({ success: true });
  response.cookies.delete(IMPERSONATION_COOKIE);
  return response;
}
