import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { canManageUsers } from "@/lib/authz";

const PAGE_SIZES = [20, 50];

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!canManageUsers(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const actorSearch = searchParams.get("actorSearch");
  const actorRole = searchParams.get("actorRole");
  const action = searchParams.get("action");
  const entityType = searchParams.get("entityType");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const requestedPageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);
  const pageSize = PAGE_SIZES.includes(requestedPageSize) ? requestedPageSize : 20;

  const where: Prisma.ActivityLogWhereInput = {};
  if (actorSearch) {
    where.actor = {
      OR: [
        { name: { contains: actorSearch, mode: "insensitive" } },
        { email: { contains: actorSearch, mode: "insensitive" } },
      ],
    };
  }
  if (actorRole) where.actorRole = actorRole as Prisma.ActivityLogWhereInput["actorRole"];
  if (action) where.action = action as Prisma.ActivityLogWhereInput["action"];
  if (entityType) where.entityType = { contains: entityType, mode: "insensitive" };
  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999Z`) } : {}),
    };
  }

  // True DB-level pagination -- never fetch the whole (unbounded,
  // append-only) table and slice in memory.
  const [logs, totalCount] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { actor: { select: { name: true, email: true } } },
    }),
    prisma.activityLog.count({ where }),
  ]);

  return NextResponse.json({
    logs,
    page,
    pageSize,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  });
}
