import { cookies } from "next/headers";
import type { AuthUser } from "@/lib/authz";

export const IMPERSONATION_COOKIE = "impersonation";

// Roles an Admin may preview the app as. Never ADMIN itself (no point) and
// never DOSEN (that's a real per-person account, not a sample-scope role).
export const IMPERSONATABLE_ROLES = ["KAPRODI", "KETUA_KK", "ACADEMIC"] as const;
export type ImpersonatableRole = (typeof IMPERSONATABLE_ROLES)[number];

export type ImpersonationState = {
  role: ImpersonatableRole;
  prodiId: string | null;
  kkId: string | null;
  scopeLabel: string | null;
};

// Pure overlay: only ever narrows privilege, and only ever applies on top of
// a *real* ADMIN identity, so a forged/stale cookie can't escalate a
// non-admin session. `realUser.id` is preserved untouched so createdById/
// assignedById-style FKs (and activity-log attribution) keep pointing at
// the real Admin's row even while impersonating. Generic over T so callers
// with a richer session-user shape (e.g. one that also carries name/email)
// keep those extra fields on the returned object.
export function applyImpersonationOverlay<T extends AuthUser>(
  realUser: T,
  state: ImpersonationState | null,
): T & Pick<AuthUser, "impersonation"> {
  if (!state || realUser.role !== "ADMIN") return realUser;
  return {
    ...realUser,
    role: state.role,
    prodiId: state.prodiId,
    kkId: state.kkId,
    impersonation: {
      impersonatedRole: state.role,
      impersonatedScopeLabel: state.scopeLabel,
    },
  };
}

export async function readImpersonationCookie(): Promise<ImpersonationState | null> {
  const store = await cookies();
  const raw = store.get(IMPERSONATION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!IMPERSONATABLE_ROLES.includes(parsed.role)) return null;
    return {
      role: parsed.role,
      prodiId: parsed.prodiId ?? null,
      kkId: parsed.kkId ?? null,
      scopeLabel: parsed.scopeLabel ?? null,
    };
  } catch {
    return null;
  }
}

export function impersonationCookieValue(state: ImpersonationState): string {
  return JSON.stringify(state);
}
