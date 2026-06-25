import type { Role } from "@prisma/client";
import { CROSS_KK_RULE } from "@/lib/config";

export type AuthUser = {
  id: string;
  role: Role;
  prodiId?: string | null;
  kkId?: string | null;
};

export function canManageUsers(user: AuthUser | null | undefined): boolean {
  return user?.role === "ADMIN";
}

export function canManageMasterData(user: AuthUser | null | undefined): boolean {
  return user?.role === "ADMIN";
}

export function canManageSemesters(user: AuthUser | null | undefined): boolean {
  return user?.role === "ADMIN";
}

/** Kaprodi may edit Mata Kuliah/offerings only for their own bound Prodi. Admin can edit any. */
export function canEditCourses(
  user: AuthUser | null | undefined,
  prodiId: string,
): boolean {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  if (user.role === "KAPRODI") return user.prodiId === prodiId;
  return false;
}

/** Everyone authenticated can view the read-only recap/plotting dashboards. */
export function canViewPlotting(user: AuthUser | null | undefined): boolean {
  return !!user;
}

/**
 * Ketua KK may assign/clear a dosen on a section, restricted to dosen in their own KK.
 * Admin may plot as a superuser and override the cross-KK restriction.
 */
export function canPlot(
  user: AuthUser | null | undefined,
  dosen: { kkId?: string | null } | null | undefined,
): { allowed: boolean; reason?: string } {
  if (!user) return { allowed: false, reason: "Not authenticated" };

  if (user.role === "ADMIN") return { allowed: true };

  if (user.role !== "KETUA_KK") {
    return { allowed: false, reason: "Your role cannot plot dosen" };
  }

  // Clearing an assignment (no dosen) is always allowed for a Ketua KK.
  if (!dosen) return { allowed: true };

  const sameKk = !dosen.kkId || dosen.kkId === user.kkId;
  if (!sameKk && CROSS_KK_RULE.blockForKetuaKk) {
    return {
      allowed: false,
      reason: "Dosen belongs to a different Kelompok Keahlian",
    };
  }

  return { allowed: true };
}

export function canManageSections(user: AuthUser | null | undefined): boolean {
  return user?.role === "ADMIN" || user?.role === "KETUA_KK";
}
