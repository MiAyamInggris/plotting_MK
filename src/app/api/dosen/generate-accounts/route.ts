import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { canManageMasterData } from "@/lib/authz";
import { generateDosenAccounts } from "@/lib/dosenAccounts";
import { logActivity } from "@/lib/activityLog";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!canManageMasterData(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const report = await generateDosenAccounts();

  await logActivity({
    user: user!,
    action: "CREATE",
    entityType: "User",
    detail: `Generated ${report.counts.accountsCreated ?? 0} dosen account(s)`,
    request,
  });

  return NextResponse.json({ report });
}
