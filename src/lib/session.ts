import { auth } from "@/auth";
import type { AuthUser } from "@/lib/authz";

export async function getSessionUser(): Promise<AuthUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  return {
    id: session.user.id,
    role: session.user.role,
    prodiId: session.user.prodiId,
    kkId: session.user.kkId,
  };
}
