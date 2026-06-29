import { auth } from "@/auth";
import type { AuthUser } from "@/lib/authz";
import { applyImpersonationOverlay, readImpersonationCookie } from "@/lib/impersonation";

export async function getSessionUser(): Promise<AuthUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  const realUser: AuthUser = {
    id: session.user.id,
    role: session.user.role,
    prodiId: session.user.prodiId,
    kkId: session.user.kkId,
    dosenId: session.user.dosenId,
  };
  const impersonationState = await readImpersonationCookie();
  return applyImpersonationOverlay(realUser, impersonationState);
}
