import { prisma } from "@/lib/prisma";
import type { ActivityAction } from "@prisma/client";
import type { AuthUser } from "@/lib/authz";

// `user.role` is already the *effective* role (overlaid by
// applyImpersonationOverlay when impersonating), so actorRole always
// reflects what the action actually ran as. impersonatedRole/Scope are only
// non-null when this was an Admin acting via "View as" -- actorUserId is
// always the real Admin's id in that case (see impersonation.ts).
export function buildActorFields(user: AuthUser) {
  return {
    actorUserId: user.id,
    actorRole: user.role,
    impersonatedRole: user.impersonation?.impersonatedRole ?? null,
    impersonatedScope: user.impersonation?.impersonatedScopeLabel ?? null,
  };
}

function extractIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip");
}

export async function logActivity({
  user,
  action,
  entityType,
  entityId,
  detail,
  request,
}: {
  user: AuthUser;
  action: ActivityAction;
  entityType: string;
  entityId?: string | null;
  detail?: string | null;
  request?: Request;
}): Promise<void> {
  await prisma.activityLog.create({
    data: {
      ...buildActorFields(user),
      action,
      entityType,
      entityId: entityId ?? null,
      detail: detail ?? null,
      ip: request ? extractIp(request) : null,
    },
  });
}
