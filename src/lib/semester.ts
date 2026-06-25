import type { SemesterPeriode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AuthUser } from "@/lib/authz";

export type SemesterResolution =
  | { ok: true; semester: SemesterPeriode; canWrite: boolean }
  | { ok: false; error: string; status: number };

/**
 * Resolves which SemesterPeriode a request should operate on.
 * - No requestedId -> the active semester (400 if none configured).
 * - requestedId provided -> 404 if missing; non-admin must have
 *   semester.aktif || semester.visibleToScopedRoles, else 403.
 *
 * canWrite is true for Admin always, or for anyone when the resolved
 * semester is the active one — Kaprodi/Ketua KK can only write to the
 * active semester, never to an opened read-only past semester.
 */
export async function resolveSemester(
  user: AuthUser | null | undefined,
  requestedId?: string | null,
): Promise<SemesterResolution> {
  if (!user) return { ok: false, error: "Unauthorized", status: 401 };

  const semester = requestedId
    ? await prisma.semesterPeriode.findUnique({ where: { id: requestedId } })
    : await prisma.semesterPeriode.findFirst({ where: { aktif: true } });

  if (!semester) {
    return requestedId
      ? { ok: false, error: "Semester not found", status: 404 }
      : { ok: false, error: "No active SemesterPeriode is configured", status: 400 };
  }

  if (user.role !== "ADMIN" && !semester.aktif && !semester.visibleToScopedRoles) {
    return { ok: false, error: "This semester is not available", status: 403 };
  }

  const canWrite = user.role === "ADMIN" || semester.aktif;
  return { ok: true, semester, canWrite };
}

/** Same as resolveSemester, but also rejects (403) when the resolved semester isn't writable. */
export async function resolveWritableSemester(
  user: AuthUser | null | undefined,
  requestedId?: string | null,
): Promise<SemesterResolution> {
  const result = await resolveSemester(user, requestedId);
  if (!result.ok) return result;
  if (!result.canWrite) {
    return { ok: false, error: "This semester is not open for editing", status: 403 };
  }
  return result;
}

/** Semesters a given user is allowed to select in the picker: Admin sees all, others see active + opened-read-only past semesters. */
export async function listSemestersFor(
  user: AuthUser | null | undefined,
): Promise<SemesterPeriode[]> {
  if (!user) return [];
  if (user.role === "ADMIN") {
    return prisma.semesterPeriode.findMany({
      orderBy: [{ tahunAjaran: "desc" }, { tipe: "asc" }],
    });
  }
  return prisma.semesterPeriode.findMany({
    where: { OR: [{ aktif: true }, { visibleToScopedRoles: true }] },
    orderBy: [{ tahunAjaran: "desc" }, { tipe: "asc" }],
  });
}
